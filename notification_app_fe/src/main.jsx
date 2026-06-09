import React from "react";
import { createRoot } from "react-dom/client";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import App from "./App";
import "./index.css";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1d4ed8"
    },
    secondary: {
      main: "#0f766e"
    },
    background: {
      default: "#f3f7ff",
      paper: "#ffffff"
    }
  },
  shape: {
    borderRadius: 18
  },
  typography: {
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    h3: {
      fontWeight: 800,
      letterSpacing: "-0.04em"
    },
    h4: {
      fontWeight: 800,
      letterSpacing: "-0.03em"
    },
    h5: {
      fontWeight: 700
    },
    h6: {
      fontWeight: 700
    }
  }
});

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
