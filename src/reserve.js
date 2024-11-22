import React, { useState } from "react";
import * as pdfjsLib from "pdfjs-dist/webpack";
import Docxtemplater from "docxtemplater";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import { motion } from "framer-motion";
import "./App.css";

const App = () => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [movieTitleData, setMovieTitleData] = useState(null);
  const [error, setError] = useState(null);

  // File change handler
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const validFileTypes = [
      "application/json",
      "text/plain",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    // File type validation
    if (!validFileTypes.includes(selectedFile.type)) {
      setError(
        "Unsupported file type. Please upload JSON, TXT, PDF, DOCX, or XLSX files."
      );
      return;
    }

    setFile(selectedFile);
    setFileName(selectedFile.name);
    setError(null);
    setMovieTitleData(null); // Clear previous movie data

    const reader = new FileReader();

    if (selectedFile.type === "application/json") {
      // JSON Parsing
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          processExtractedData({
            title: data.movie?.title || "Not Available",
            director: data.movie?.director || "Not Available",
            producer: data.movie?.producer || "Not Available",
            musicComposer: data.movie?.musicComposer || "Not Available",
          });
        } catch {
          setError("Invalid JSON file format.");
        }
      };
      reader.readAsText(selectedFile);
    } else if (selectedFile.type === "application/pdf") {
      // PDF Parsing
      reader.onload = async () => {
        try {
          const pdfData = new Uint8Array(reader.result); // Convert file to Uint8Array
          const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise; // Load PDF

          let text = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map((item) => item.str).join(" ");
            text += pageText + "\n";
          }

          if (!text.trim()) throw new Error("No text extracted from PDF.");
          const extractedData = extractMovieDataFromText(text);
          // Only process data if it's new or different from current data
          if (
            !movieTitleData ||
            JSON.stringify(movieTitleData) !== JSON.stringify(extractedData)
          ) {
            processExtractedData(extractedData);
          }
        } catch (error) {
          console.error("PDF Processing Error:", error);
          setError(
            "Error processing PDF file. Please ensure it contains valid text."
          );
        }
      };
      reader.readAsArrayBuffer(selectedFile); // Use readAsArrayBuffer for PDFs
    } else if (selectedFile.type === "text/plain") {
      // Text Parsing
      reader.onload = () => {
        processExtractedData(extractMovieDataFromText(reader.result));
      };
      reader.readAsText(selectedFile);
    } else if (
      selectedFile.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      // DOCX Parsing
      reader.onload = async () => {
        try {
          const zip = await JSZip.loadAsync(reader.result);
          const doc = new Docxtemplater().loadZip(zip);
          const text = doc.getFullText();
          processExtractedData(extractMovieDataFromText(text));
        } catch {
          setError("Error processing DOCX file.");
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    } else if (
      selectedFile.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      // XLSX Parsing
      reader.onload = () => {
        try {
          const data = new Uint8Array(reader.result);
          const workbook = XLSX.read(data, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(sheet);
          processExtractedData({
            title: jsonData[0]?.Title || "Not Available",
            director: jsonData[0]?.Director || "Not Available",
            producer: jsonData[0]?.Producer || "Not Available",
            musicComposer: jsonData[0]?.MusicComposer || "Not Available",
          });
        } catch {
          setError("Error processing XLSX file.");
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  // Extract movie data from plain text
  const extractMovieDataFromText = (textContent) => {
    // Use regex to extract the relevant fields
    const titleMatch = textContent.match(/Title:\s*([^\n]+)/i);
    const directorMatch = textContent.match(/Director:\s*([^\n]+)/i);
    const producerMatch = textContent.match(/Producer:\s*([^\n]+)/i);
    const composerMatch = textContent.match(
      /Music\s*Composer\s*[:|-]?\s*([^\n]+)/i
    );

    return {
      title: titleMatch ? titleMatch[1].trim() : "Not Available",
      director: directorMatch ? directorMatch[1].trim() : "Not Available",
      producer: producerMatch ? producerMatch[1].trim() : "Not Available",
      musicComposer: composerMatch ? composerMatch[1].trim() : "Not Available",
    };
  };

  // Process and set extracted data
  const processExtractedData = (data) => {
    // Prevent duplication by checking if the data is identical to current state
    if (
      !movieTitleData ||
      movieTitleData.title !== data.title ||
      movieTitleData.director !== data.director ||
      movieTitleData.producer !== data.producer ||
      movieTitleData.musicComposer !== data.musicComposer
    ) {
      setMovieTitleData(data); // Update state only if data is different
      setError(null); // Reset error if data is successfully processed
    }
  };

  // File delete handler
  const handleFileDelete = () => {
    setFile(null);
    setFileName("");
    setMovieTitleData(null);
    setError(null);
    document.getElementById("file-input").value = "";
  };

  return (
    <div className="app-container">
      <h1 className="title">🎬 Movie Title Maker 🎬</h1>

      <div className="upload-container">
        <label htmlFor="file-input" className="file-input-label">
          Choose File
        </label>
        <input
          id="file-input"
          type="file"
          accept=".json, .txt, .pdf, .docx, .xlsx"
          onChange={handleFileChange}
          className="file-input"
        />

        {fileName && !error && (
          <div className="file-name">
            <span>{`Selected: ${fileName}`}</span>
            <button className="delete-btn" onClick={handleFileDelete}>
              Delete
            </button>
          </div>
        )}
        {error && <div className="error-message">{error}</div>}
      </div>

      {movieTitleData && !error && (
        <motion.div
          className="preview-container"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
        >
          <motion.h2
            className="movie-title"
            initial={{ x: -200 }}
            animate={{ x: 0 }}
            transition={{ duration: 0.6 }}
          >
            {movieTitleData.title}
          </motion.h2>
          <div className="preview-details">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <strong>Director:</strong> {movieTitleData.director}
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <strong>Producer:</strong> {movieTitleData.producer}
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <strong>Music Composer:</strong> {movieTitleData.musicComposer}
            </motion.p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default App;
