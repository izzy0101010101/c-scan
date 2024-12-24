const fs = require("fs");
const path = require("path");

// Function to recursively scan a directory with an optional filter
function scanDirectory(directory, includeTestFiles = false) {
  let results = [];
  const files = fs.readdirSync(directory);

  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      results = results.concat(scanDirectory(fullPath, includeTestFiles));
    } else if (fullPath.endsWith(".js") || fullPath.endsWith(".ts")) {
      if (!includeTestFiles && (fullPath.endsWith(".spec.js") || fullPath.endsWith(".spec.ts") || fullPath.endsWith(".test.js") || fullPath.endsWith(".test.ts"))) {
        continue; // Exclude spec/test files for main logic
      }
      results.push(fullPath);
    }
  }

  return results;
}

// Function to analyze files for routes and other URL patterns
function analyzeFiles(files) {
  const routeMappings = [];
  const otherUrls = [];
  const basePaths = []; // Store base paths from app.use or router.use

  const routeRegex =
    /(router|app)\.(get|post|put|delete|patch|use|all|param|head|options)\(['\"`]([^'\"`]+)['\"`]/gi;
  const otherUrlRegex = /['\"`]\/[^\s\"'`;]+['\"`]/g; // Matches any string starting with /

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, "utf-8");

      // Match routes
      let match;
      while ((match = routeRegex.exec(content)) !== null) {
        const [_, handler, method, route] = match;

        if (method.toLowerCase() === "use") {
          // Capture base paths
          basePaths.push(route);
        } else {
          // Add regular routes
          routeMappings.push({
            route,
            method: method.toUpperCase(),
            file,
          });
        }
      }

      // Match other URLs starting with /
      let otherMatch;
      while ((otherMatch = otherUrlRegex.exec(content)) !== null) {
        const url = otherMatch[0].replace(/['\"`]/g, ""); // Clean quotes
        otherUrls.push({ url, file });
      }
    } catch (error) {
      console.error(`Error reading file: ${file}`, error.message);
    }
  }

  return { routeMappings, basePaths, otherUrls };
}

// Function to generate all possible route combinations
function generateRouteCombinations(routeMappings, basePaths) {
  const combinations = [];

  routeMappings.forEach(({ route, method, file }) => {
    if (basePaths.length > 0) {
      // Combine each route with all base paths
      basePaths.forEach((basePath) => {
        combinations.push({
          route: path.join(basePath, route).replace(/\\/g, "/"), // Ensure proper URL format
          method,
          file,
        });
      });
    } else {
      // If no base paths, add route as-is
      combinations.push({ route, method, file });
    }
  });

  return combinations;
}

// Function to extract path parameters
function extractPathParameters(routeMappings) {
  const pathParamMappings = [];

  routeMappings.forEach(({ route, file }) => {
    const pathParams = Array.from(route.matchAll(/:([a-zA-Z0-9_]+)/g)).map((match) => match[1]);
    if (pathParams.length > 0) {
      pathParamMappings.push({
        route,
        file,
        parameters: pathParams,
      });
    }
  });

  return pathParamMappings;
}

// Function to extract headers
function extractHeaders(files) {
  const headersMappings = [];

  const headerRegex = /req\.headers\[['\"`]([a-zA-Z0-9_-]+)['\"`]\]/g;

  files.forEach((file) => {
    try {
      const content = fs.readFileSync(file, "utf-8");
      const headers = new Set();

      let match;
      while ((match = headerRegex.exec(content)) !== null) {
        const header = match[1];
        if (header) headers.add(header);
      }

      if (headers.size > 0) {
        headersMappings.push({
          file,
          headers: Array.from(headers),
        });
      }
    } catch (error) {
      console.error(`Error reading file for headers: ${file}`, error.message);
    }
  });

  return headersMappings;
}

// Function to extract body and query parameters
function extractParameters(files) {
  const paramMappings = {
    body: [],
    query: []
  };

  const bodyParamRegex = /req\.body(?:\.([a-zA-Z0-9_]+)|\[['\"`]([a-zA-Z0-9_]+)['\"`]\])/g;
  const queryParamRegex = /req\.query(?:\.([a-zA-Z0-9_]+)|\[['\"`]([a-zA-Z0-9_]+)['\"`]\])/g;
  const destructureRegex = /const\s*\{\s*([^}]+)\s*\}\s*=\s*req\.(body|query)/g;

  files.forEach((file) => {
    try {
      const content = fs.readFileSync(file, "utf-8");
      const bodyParams = new Set();
      const queryParams = new Set();

      let match;

      // Match direct access to req.body
      while ((match = bodyParamRegex.exec(content)) !== null) {
        const param = match[1] || match[2];
        if (param) bodyParams.add(param);
      }

      // Match direct access to req.query
      while ((match = queryParamRegex.exec(content)) !== null) {
        const param = match[1] || match[2];
        if (param) queryParams.add(param);
      }

      // Match destructuring of req.body or req.query
      let destructureMatch;
      while ((destructureMatch = destructureRegex.exec(content)) !== null) {
        const destructuredParams = destructureMatch[1]
          .split(",")
          .map((param) => param.trim().split(" ")[0]);
        const target = destructureMatch[2];
        destructuredParams.forEach((param) =>
          target === "body" ? bodyParams.add(param) : queryParams.add(param)
        );
      }

      if (bodyParams.size > 0) {
        paramMappings.body.push({
          file,
          parameters: Array.from(bodyParams),
        });
      }

      if (queryParams.size > 0) {
        paramMappings.query.push({
          file,
          parameters: Array.from(queryParams),
        });
      }
    } catch (error) {
      console.error(`Error reading file for parameters: ${file}`, error.message);
    }
  });

  return paramMappings;
}

// Function to generate query string with unique values
function generateQueryString(paramMappings) {
  const allParams = new Set();

  paramMappings.body.forEach((mapping) => {
    mapping.parameters.forEach((param) => allParams.add(param.replace(/:/g, "")));
  });

  paramMappings.query.forEach((mapping) => {
    mapping.parameters.forEach((param) => allParams.add(param.replace(/:/g, "")));
  });

  let counter = 1;
  const queryString = Array.from(allParams)
    .map((param) => `${param}=CSCAN${counter++}`)
    .join("&");

  return queryString;
}

function extractEnvironmentVariables(files) {
  const envVarRegex = /process\.env\.([a-zA-Z0-9_]+)/g;
  const envVars = new Set();

  files.forEach((file) => {
    try {
      const content = fs.readFileSync(file, "utf-8");
      let match;
      while ((match = envVarRegex.exec(content)) !== null) {
        envVars.add(match[1]); // Add variable name to the set
      }
    } catch (error) {
      console.error(`Error reading file for environment variables: ${file}`, error.message);
    }
  });

  return Array.from(envVars).sort(); // Return sorted array of unique variables
}

// Function to extract hardcoded secrets or credentials
function extractHardcodedSecrets(files) {
  const secretsMappings = [];

  // Keywords to look for
  const keywords = [
    // "token",
    // "key",
    // "secret",
    // "password",
    // "access_key"
  ];

  // const keywordRegex = new RegExp(`\\b(${keywords.join("|")})\\b`, "i"); // Case-insensitive match

  // files.forEach((file) => {
  //   try {
  //     const content = fs.readFileSync(file, "utf-8");
  //     const secrets = new Set();

  //     // Split content into lines and check for keywords
  //     const lines = content.split("\n");
  //     lines.forEach((line) => {
  //       if (keywordRegex.test(line)) {
  //         secrets.add(line.trim()); // Add the whole line
  //       }
  //     });

  //     if (secrets.size > 0) {
  //       secretsMappings.push({
  //         file,
  //         secrets: Array.from(secrets),
  //       });
  //     }
  //   } catch (error) {
  //     console.error(`Error reading file for secrets: ${file}`, error.message);
  //   }
  // });

  return secretsMappings;
}



const parseComments = (files) => {
  const commentMappings = [];

  const singleLineCommentRegex = /\/\/(.*)/g; // Matches single-line comments
  const multiLineCommentRegex = /\/\*([\s\S]*?)\*\//g; // Matches multi-line comments

  files.forEach((file) => {
    try {
      const content = fs.readFileSync(file, "utf-8");
      const comments = [];

      // Match single-line comments
      let match;
      while ((match = singleLineCommentRegex.exec(content)) !== null) {
        comments.push(match[1].trim());
      }

      // Match multi-line comments
      while ((match = multiLineCommentRegex.exec(content)) !== null) {
        comments.push(match[1].trim());
      }

      if (comments.length > 0) {
        commentMappings.push({
          file,
          comments,
        });
      }
    } catch (error) {
      console.error(`Error reading file for comments: ${file}`, error.message);
    }
  });

  return commentMappings;
};


// Function to write outputs dynamically
function writeOutputs(routeMappings, basePaths, otherUrls, paramMappings, headersMappings, envVariables, secretsMappings, commentMappings, folderName) {

  const outputDir = path.join(__dirname, "data", folderName);

  // Ensure the folder-specific output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate all possible combinations
  const combinations = generateRouteCombinations(routeMappings, basePaths);

  // Combine routes and other URLs
  const allEndpoints = Array.from(new Set([
    ...combinations.map((route) => route.route.replace(/\?$/, "").replace(/\/+$/, "")), // Remove trailing slashes
    ...otherUrls.map((url) => url.url.replace(/\?$/, "").replace(/\/+$/, "")) // Normalize other URLs
  ]));

  // Ensure only valid endpoints, excluding lonely `/` if not needed
  const uniqueEndpoints = Array.from(new Set(allEndpoints))
    .filter((endpoint) => endpoint !== "/") // Remove lonely `/`
    .sort();

  // Write JSON output for routes
  const jsonFilePath = path.join(outputDir, "routes.json");
  fs.writeFileSync(jsonFilePath, JSON.stringify(combinations, null, 2));
  console.log(`Routes JSON written to: ${jsonFilePath}`);

  // Write endpoints to a text file
  const textFilePath = path.join(outputDir, "endpoints.txt");
  fs.writeFileSync(textFilePath, uniqueEndpoints.join("\n"));
  console.log(`Endpoints written to: ${textFilePath}`);

  // Write body parameters
  const bodyParamFilePath = path.join(outputDir, "body_parameters.json");
  fs.writeFileSync(bodyParamFilePath, JSON.stringify(paramMappings.body, null, 2));
  console.log(`Body parameters JSON written to: ${bodyParamFilePath}`);

  // Write query parameters
  const queryParamFilePath = path.join(outputDir, "query_parameters.json");
  fs.writeFileSync(queryParamFilePath, JSON.stringify(paramMappings.query, null, 2));
  console.log(`Query parameters JSON written to: ${queryParamFilePath}`);

  // Write path parameters
  const pathParamFilePath = path.join(outputDir, "path_parameters.json");
  const pathParams = extractPathParameters(routeMappings);
  fs.writeFileSync(pathParamFilePath, JSON.stringify(pathParams, null, 2));
  console.log(`Path parameters JSON written to: ${pathParamFilePath}`);

  // Write headers JSON
  const headersFilePath = path.join(outputDir, "headers.json");
  fs.writeFileSync(headersFilePath, JSON.stringify(headersMappings, null, 2));
  console.log(`Headers JSON written to: ${headersFilePath}`);

  // Write headers to a text file (no duplicates, sorted)
  const headersTextFilePath = path.join(outputDir, "headers.txt");
  const allHeaders = new Set();
  headersMappings.forEach((mapping) => {
    mapping.headers.forEach((header) => allHeaders.add(header));
  });
  fs.writeFileSync(headersTextFilePath, Array.from(allHeaders).sort().join("\n"));
  console.log(`Headers written to: ${headersTextFilePath}`);

  // Write other URLs
  const otherUrlsFilePath = path.join(outputDir, "other_urls.json");
  fs.writeFileSync(otherUrlsFilePath, JSON.stringify(otherUrls, null, 2));
  console.log(`Other URLs written to: ${otherUrlsFilePath}`);

  // Write combined query string
  const queryString = generateQueryString(paramMappings);
  const queryStringFilePath = path.join(outputDir, "query_string.txt");
  fs.writeFileSync(queryStringFilePath, queryString);
  console.log(`Query string written to: ${queryStringFilePath}`);

  // Write environment variables to a text file
  const envVarsFilePath = path.join(outputDir, "environment_variables.txt");
  fs.writeFileSync(envVarsFilePath, envVariables.join("\n"));
  console.log(`Environment variables written to: ${envVarsFilePath}`);

  // Write hardcoded secrets to a JSON file
  const secretsFilePath = path.join(outputDir, "hardcoded_secrets.json");
  fs.writeFileSync(secretsFilePath, JSON.stringify(secretsMappings, null, 2));
  console.log(`Hardcoded secrets written to: ${secretsFilePath}`);

  // Write comments to a CSV file
  const commentsCSVFilePath = path.join(outputDir, "comments.csv");
  const commentLines = ["File,Comment"]; // CSV header

  commentMappings.forEach(({ file, comments }) => {
    comments.forEach((comment) => {
      // Escape commas in the comments to avoid breaking CSV formatting
      commentLines.push(`"${file}","${comment.replace(/"/g, '""')}"`);
    });
  });

  fs.writeFileSync(commentsCSVFilePath, commentLines.join("\n"));
  console.log(`Comments CSV written to: ${commentsCSVFilePath}`);

  // Log totals
  console.log(`Total unique routes found: ${uniqueEndpoints.length}`);
  console.log(`Total body parameter mappings: ${paramMappings.body.length}`);
  console.log(`Total query parameter mappings: ${paramMappings.query.length}`);
  console.log(`Total path parameter mappings: ${pathParams.length}`);
  console.log(`Total headers found: ${allHeaders.size}`);
  // console.log(`Total environment variables found: ${envVariables.reduce((sum, item) => sum + item.envVars.length, 0)}`);
  // console.log(`Total hardcoded secrets found: ${secretsMappings.reduce((sum, item) => sum + item.secrets.length, 0)}`);
  console.log(`Total other URLs found: ${otherUrls.length}`);
}

// Main function
function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error("Please provide the directory to scan as an argument.");
    process.exit(1);
  }

  const targetDirectory = args[0];

  if (!fs.existsSync(targetDirectory)) {
    console.error(`Directory not found: ${targetDirectory}`);
    process.exit(1);
  }

  // Get the folder name for dynamic outputs
  const folderName = path.basename(targetDirectory);

  console.log(`Scanning directory: ${targetDirectory}`);
  const files = scanDirectory(targetDirectory);

  console.log("Analyzing files for routes...");
  const { routeMappings, basePaths, otherUrls } = analyzeFiles(files);

  console.log("Extracting parameters...");
  const paramMappings = extractParameters(files);

  console.log("Extracting headers...");
  const headersMappings = extractHeaders(files);

  console.log("Extracting environment variables...");
  const envVariables = extractEnvironmentVariables(files);

  console.log("Extracting hardcoded secrets...");
  const secretsMappings = extractHardcodedSecrets(files);

  console.log("Extracting comments...");
  const commentMappings = parseComments(files);



  // Write dynamic outputs
  writeOutputs(
    routeMappings,
    basePaths,
    otherUrls,
    paramMappings,
    headersMappings,
    envVariables,
    secretsMappings,
    commentMappings,
    folderName
  );
}

// Run the script
main();
