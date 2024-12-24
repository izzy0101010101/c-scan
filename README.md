# Route Scanner Tool

This tool scans a folder for routes in JavaScript or TypeScript files, specifically designed for Node.js projects utilizing Express.js frameworks. It generates detailed outputs in a `data/<folder_name>` directory. Ideal for application security (AppSec) teams, researchers, and white-box cybersecurity specialists analyzing Node.js code.

Note: This project is a work in progress, and features are being actively developed and improved.

## Who Can Use It
- **Application Security Teams**: To identify potential security risks in route handling.
- **Cybersecurity Researchers**: For white-box analysis of Node.js codebases.
- **Developers and Auditors**: To ensure proper API structure and avoid route mismanagement.

## Features

1. **Recursive Scan**: Includes subdirectories.
2. **Express.js Focus**: Designed for Node.js projects using the Express.js framework.
3. **Captured Methods**: Detects `get`, `post`, `put`, `delete`, `patch`, `use`, and more.
4. **Parameters Extraction**: Identifies:
   - Body parameters (`req.body`)
   - Query parameters (`req.query`)
   - Path parameters (e.g., `:id`)
5. **Headers Detection**: Extracts headers from API calls (e.g., `req.headers`).
6. **Environment Variables**: Lists `process.env` variables used in routes.
7. **Comments Parsing**: Extracts all comments, including TODOs and logs, to a CSV file.
8. **Other URLs**: Includes non-standard URLs detected in the code.

## Usage

### Prerequisites

- Node.js installed on your system.

### Run the Tool
```bash
node scanRoutes.js <folder_path>
```

#### Example:
```bash
node scanRoutes.js "C:/Users/username/projects/my-app"
```

## Outputs

Generated outputs are saved in the `data/<folder_name>` directory:

- **`routes.json`**: Detailed routes with HTTP methods and originating files.
- **`endpoints.txt`**: All unique routes, sorted and deduplicated.
- **`body_parameters.json`**: Extracted `req.body` parameters.
- **`query_parameters.json`**: Extracted `req.query` parameters.
- **`path_parameters.json`**: Extracted path parameters (e.g., `:id`).
- **`headers.json`**: Extracted headers used in API calls.
- **`headers.txt`**: Unique headers in text format.
- **`environment_variables.json`**: Detected `process.env` variables.
- **`comments.csv`**: All comments found in the code.
- **`query_string.txt`**: Query string of all parameters combined.
- **`other_urls.json`**: Non-standard URLs not mapped to routers.

### Example Structure:
```
data/
└── my-app/
    ├── routes.json
    ├── endpoints.txt
    ├── body_parameters.json
    ├── query_parameters.json
    ├── path_parameters.json
    ├── headers.json
    ├── headers.txt
    ├── environment_variables.json
    ├── comments.csv
    ├── query_string.txt
    ├── other_urls.json
```

### Notes

- Automatically skips `*.spec.js` files for route scanning but includes them for comments and secrets extraction.
- Handles files with `.js` and `.ts` extensions by default.
- Removes duplicate and root (`/`) routes from the outputs.
- Logs warnings for files with syntax errors.

For support or enhancements, feel free to reach out!

