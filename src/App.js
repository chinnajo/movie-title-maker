import React, { useState } from "react";
import { PDFDocument } from 'pdf-lib'; // Import PDF-lib
import Docxtemplater from 'docxtemplater'; // Import Docxtemplater for DOCX
import JSZip from 'jszip'; // Needed by docxtemplater
import * as XLSX from 'xlsx'; // Import SheetJS for XLSX files

import './App.css';

const App = () => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState("");
  const [movieTitleData, setMovieTitleData] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    const validFileTypes = [
      "application/json",
      "text/plain", // Add text file support here
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setMovieTitleData(null);
      setError(null);

      if (!validFileTypes.includes(selectedFile.type)) {
        setError("Unsupported file type. Please upload JSON, TXT, PDF, DOCX, or XLSX files.");
        return;
      }

      const reader = new FileReader();
      reader.onload = async () => {
        const content = reader.result;

        try {
          let extractedData = {};

          if (selectedFile.type === "application/json") {
            // Handle JSON files directly
            extractedData = JSON.parse(content);
            extractedData = formatMovieData(extractedData);
          } 
          else if (selectedFile.type === "application/pdf") {
            const pdfDoc = await PDFDocument.load(content);
            const pages = pdfDoc.getPages();
            let textContent = '';
            for (let page of pages) {
              const pageText = await page.getTextContent();
              textContent += pageText.items.map(item => item.str).join(' ');
            }

            extractedData = extractMovieDataFromText(textContent);

          } else if (selectedFile.type === "text/plain") {
            const textContent = content; // Directly use the file content
            extractedData = extractMovieDataFromText(textContent);

          } else if (selectedFile.type === "application/msword" || selectedFile.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            const zip = await JSZip.loadAsync(content);
            const doc = new Docxtemplater().loadZip(zip);
            const text = doc.getFullText(); // Extract text from DOCX
            extractedData = extractMovieDataFromText(text);

          } else if (selectedFile.type === "application/vnd.ms-excel" || selectedFile.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
            const data = new Uint8Array(content);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(sheet);

            // Assuming Excel data has columns "Title", "Director", "Producer", and "Music Composer"
            const row = jsonData[0]; // Taking the first row of data
            extractedData = {
              title: row["Title"] || "Not Available",
              director: row["Director"] || "Not Available",
              producer: row["Producer"] || "Not Available",
              musicComposer: row["Music Composer"] || "Not Available"
            };
          }

          // Now check for missing fields and set the appropriate validation message
          const missingFields = [];
          if (!extractedData.title.trim() || extractedData.title.trim() === "Not Available") missingFields.push("Title");
          if (!extractedData.director.trim() || extractedData.director.trim() === "Not Available") missingFields.push("Director");
          if (!extractedData.producer.trim() || extractedData.producer.trim() === "Not Available") missingFields.push("Producer");
          if (!extractedData.musicComposer.trim() || extractedData.musicComposer.trim() === "Not Available") missingFields.push("Music Composer");

          if (missingFields.length > 0) {
            setError(`Data missing: ${missingFields.join(', ')}`);
          } else {
            setMovieTitleData(extractedData);
          }

        } catch (err) {
          setError("Error processing the file.");
        }
      };
      reader.readAsText(selectedFile); // Read as text for .txt files
    }
  };

  // Utility function to extract movie data from text
  const extractMovieDataFromText = (textContent) => {
    // Improved regex patterns to extract fields
    const titleMatch = textContent.match(/Title:\s*([^\n]+)/i);
    const directorMatch = textContent.match(/Director:\s*([^\n]+)/i);
    const producerMatch = textContent.match(/Producer:\s*([^\n]+)/i);
    const composerMatch = textContent.match(/Music Composer:\s*([^\n]+)/i);

    return {
      title: titleMatch ? titleMatch[1].trim() : "Not Available",
      director: directorMatch ? directorMatch[1].trim() : "Not Available",
      producer: producerMatch ? producerMatch[1].trim() : "Not Available",
      musicComposer: composerMatch ? composerMatch[1].trim() : "Not Available"
    };
  };

  const formatMovieData = (data) => {
    return {
      title: data.title || "Not Available",
      director: data.director || "Not Available",
      producer: data.producer || "Not Available",
      musicComposer: data.musicComposer || "Not Available"
    };
  };

  const handleFileDelete = () => {
    setFile(null);
    setFileName("");
    setMovieTitleData(null);
    setError(null);
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
            <button className="delete-btn" onClick={handleFileDelete}>Delete</button>
          </div>
        )}
        {error && <div className="error-message">{error}</div>}
      </div>

      {movieTitleData && !error && (
        <div className="preview-container">
          <h2>{movieTitleData.title}</h2>
          <div className="preview-details">
            <p><strong>Director:</strong> {movieTitleData.director}</p>
            <p><strong>Producer:</strong> {movieTitleData.producer}</p>
            <p><strong>Music Composer:</strong> {movieTitleData.musicComposer}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
