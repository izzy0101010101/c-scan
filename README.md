# Route Scanner Tool

This script scans a specified folder for routes defined in JavaScript or TypeScript files and generates output files that list the routes found. The outputs are saved dynamically in a subdirectory under a `data` folder, named after the folder being scanned.

## Usage

### Prerequisites

- Node.js must be installed on your system.
- Ensure the script file (e.g., `scanRoutes.js`) is saved in a directory you can access.

### Running the Script

To run the script, use the following command:

```bash
node scanRoutes.js <folder_path>
```

#### Example:
```bash
node scanRoutes.js "C:/Users/username/projects/my-app"
```

### Outputs

For each folder scanned, the script creates a subdirectory inside the `data` folder. The subdirectory is named after the folder being scanned. Two files are generated:

1. **`routes.json`**:
   - A JSON file containing detailed information about the routes, including their HTTP method, path, and originating file.

2. **`endpoints.txt`**:
   - A plain text file listing all unique routes, with each route on a new line.

#### Example Folder Structure After Scan
```
data/
└── my-app/
    ├── routes.json
    ├── endpoints.txt
```

### Script Behavior

1. **Recursive Scan**:
   - The script scans all subdirectories and files under the specified folder.

2. **Supported Files**:
   - Includes `.js` and `.ts` files.
   - Excludes test files (`*.spec.js`).

3. **Captured Methods**:
   - The script identifies the following methods:
     - `get`, `post`, `put`, `delete`, `patch`, `use`, `all`, `param`, `head`, `options`.

4. **Duplicate Routes**:
   - Duplicate or irrelevant root routes (`/`) are filtered out.

### Example Outputs

#### `routes.json`
```json
[
  { "route": "/home", "method": "GET", "file": "path/to/file.js" },
  { "route": "/api/data", "method": "POST", "file": "path/to/file.js" },
  { "route": "/middleware", "method": "USE", "file": "path/to/file.js" }
]
```

#### `endpoints.txt`
```
/home
/api/data
/middleware
```

### Logging

The script outputs progress logs to the terminal, including:
- The directory being scanned.
- The locations of the generated files.
- The total number of unique routes found.

### Notes

- Ensure the scanned folder contains valid JavaScript or TypeScript files.
- Invalid files or syntax errors will be skipped, and a message will be logged.

### Support

For any issues or enhancements, feel free to reach out!

