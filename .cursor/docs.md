# RAG Mindmap Project Documentation

This document provides an overview of the RAG Mindmap project, consisting of a React frontend (`rag-mindmap-frontend`) and a Python FastAPI backend (`rag-mindmap-backend`).

## Overview

The application allows users to upload a PDF document. The backend processes the PDF using the Google Gemini AI model to automatically generate a hierarchical mind map based on the document's content. The frontend then displays this mind map using `reactflow`, automatically arranging the nodes using the `dagre` layout library.

## Backend Service (`rag-mindmap-backend`)

The backend is responsible for receiving PDF uploads, interacting with the AI model, and returning the generated mind map structure.

### Technology Stack

*   **Framework:** FastAPI (Python)
*   **AI Model:** Google Gemini (via `google-generativeai` library)
*   **Dependencies:** `fastapi`, `uvicorn`, `python-multipart`, `google-generativeai`, `python-dotenv` (See `requirements.txt`)

### Project Structure (`rag-mindmap-backend`)

```
rag-mindmap-backend/
├── venv/                 # Virtual environment (recommended)
├── .env                  # Environment variables (contains GOOGLE_API_KEY - **DO NOT COMMIT**)
├── main.py               # FastAPI application, API endpoint, Gemini integration
└── requirements.txt      # Python dependencies
```

### Key Components (`main.py`)

1.  **FastAPI App:** Initializes the FastAPI application.
2.  **CORS Middleware:** Configured to allow requests from the frontend development server (e.g., `http://localhost:5173`).
3.  **Pydantic Model (`Branch`):** Defines the expected structure for a mind map branch (`id`, `topic`, `summary`, `children`). Used for response validation.
4.  **API Endpoint (`POST /generate_mindmap/`):**
    *   Accepts PDF file uploads (`UploadFile`).
    *   Reads the PDF content as bytes.
    *   Requires the `GOOGLE_API_KEY` environment variable to be set.
    *   Constructs a prompt for the Gemini model (`gemini-2.0-flash` by default), instructing it to analyze the PDF and return a JSON matching the `Branch` schema.
    *   Sends the prompt and PDF bytes to the Gemini API, requesting a JSON response (`response_mime_type="application/json"`).
    *   Parses the JSON response from Gemini.
    *   Validates the parsed JSON against the `Branch` Pydantic model.
    *   Returns the validated `Branch` object representing the root of the mind map.
    *   Includes error handling for invalid file types, missing API keys, Gemini API errors, JSON parsing errors, and Pydantic validation errors.

## Frontend Application (`rag-mindmap-frontend`)

The frontend provides the user interface for uploading files and displays the interactive mind map.

### Technology Stack

*   **Framework:** React (with Vite)
*   **Mind Map Rendering:** `reactflow`
*   **Layout Calculation:** `dagre`

### Project Structure (`rag-mindmap-frontend`)

```
rag-mindmap-frontend/
├── public/               # Static assets
├── src/
│   ├── assets/
│   ├── App.css           # Main app styles
│   ├── App.jsx           # Core application component (handles API calls, state, layout)
│   ├── BranchNode.jsx    # Custom reactflow node for branches
│   ├── FileUpload.jsx    # Component for file input
│   ├── index.css         # Global styles
│   ├── main.jsx          # Application entry point
│   ├── MindMap.jsx       # Reactflow canvas wrapper component
│   └── RootNode.jsx      # Custom reactflow node for the root/source
├── .gitignore
├── eslint.config.js
├── index.html
├── package-lock.json
├── package.json          # Project dependencies (React, reactflow, dagre, etc.)
├── README.md
└── vite.config.js
```

### Key Components (Frontend)

1.  **`main.jsx`**: Sets up React root, renders `App`. (Unchanged)

2.  **`App.jsx`**: (**Major Changes**)
    *   Manages state for `reactflow` nodes and edges, `isLoading`, and `error` messages.
    *   **API Integration:**
        *   The `handleFileSelected` function is now `async`.
        *   When a file is selected, it sets `isLoading` to true, clears previous nodes/edges, and displays the filename.
        *   It sends the file via `fetch` to the backend endpoint (`POST /generate_mindmap/`).
        *   Handles potential errors during the fetch call or from the backend response.
    *   **Layout Calculation (Dagre):**
        *   Includes helper functions (`createGraphElements`, `getLayoutedElements`).
        *   `createGraphElements`: Recursively converts the hierarchical JSON received from the backend into basic `reactflow` nodes and edges (without position information).
        *   `getLayoutedElements`: Takes the basic nodes/edges, uses the `dagre` library to calculate optimal `x`, `y` positions for each node based on estimated dimensions (`NODE_WIDTH`, `NODE_HEIGHT`) and layout settings (`rankdir`, `nodesep`, `ranksep`).
        *   The nodes returned by `getLayoutedElements` (with positions) are used to update the `reactflow` state.
    *   **Rendering:**
        *   Conditionally renders loading and error messages.
        *   Passes the layouted nodes and edges to the `MindMap` component.
    *   **Removed Manual Logic:** Initial static nodes and functions for manually adding branches (`handleAddBranchFromRoot`, `handleAddSubBranch`) have been removed, as the structure is now fully generated from the backend.

3.  **`MindMap.jsx`**: Wraps `ReactFlow`, defines custom node types (`RootNode`, `BranchNode`). (Largely unchanged, now receives dynamically generated nodes/edges).

4.  **`RootNode.jsx`**: Custom node. Displays `data.label` (topic) and `data.summary`. (No longer needs `onAddBranch` prop).

5.  **`BranchNode.jsx`**: Custom node. Displays `data.label` (topic) and `data.summary`. (No longer needs `onAddSubBranch` prop).

6.  **`FileUpload.jsx`**: Provides file input. Calls `handleFileSelected` in `App.jsx`. (Now has a `disabled` prop controlled by `isLoading` state in `App.jsx`).

## Data Flow (Updated)

1.  User opens the frontend application.
2.  User selects a PDF file using the `FileUpload` component.
3.  `FileUpload` calls `handleFileSelected` in `App.jsx`.
4.  `App.jsx` sets the loading state, clears the current map, and sends the PDF file to the backend API (`POST /generate_mindmap/`).
5.  Backend (`main.py`) receives the file.
6.  Backend sends the PDF content and a structured prompt to the Gemini API.
7.  Gemini analyzes the PDF and returns a hierarchical JSON representing the mind map (topics, summaries, children).
8.  Backend validates the JSON response against the Pydantic model and sends it back to the frontend.
9.  `App.jsx` receives the JSON response.
10. `App.jsx` calls `createGraphElements` to convert the JSON into basic `reactflow` nodes/edges (without positions).
11. `App.jsx` calls `getLayoutedElements`, passing the basic nodes/edges. `dagre` calculates the layout and positions.
12. `App.jsx` updates its state with the layouted nodes and edges.
13. `MindMap.jsx` re-renders, displaying the automatically generated and positioned mind map using the `RootNode` and `BranchNode` components.
14. Loading state is cleared. If an error occurred at any step, an error message is displayed instead of the map. 