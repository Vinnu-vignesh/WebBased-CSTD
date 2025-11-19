import React, { useState } from 'react';
import axios from 'axios';

// CRITICAL: Must match the Flask host and port
const FLASK_API_URL = 'http://127.0.0.1:5000/api/predict';

// =================================================================
// 0. LOADER COMPONENT (Self-contained)
// =================================================================
const SimpleLoader = () => (
    <div style={loaderStyles.container}>
        <div style={loaderStyles.spinner}></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
);
const loaderStyles = {
    container: { display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '20px auto' },
    spinner: {
        border: '4px solid #374151', borderTop: '4px solid #10b981',
        borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite',
    }
};

// =================================================================
// 1. AESTHETIC HOME VIEW (The Landing Page)
// =================================================================
const HomeView = ({ setView }) => (
    <div style={homeStyles.container}>
        <h1 style={homeStyles.title}>Cyber Security Threat Analyzer</h1>
        <p style={homeStyles.subtitle}>
            Leveraging Machine Learning for instant batch classification of network traffic logs.
        </p>
        <button
            onClick={() => setView('predict')}
            style={homeStyles.button}
        >
            Start Analysis
        </button>
        <div style={homeStyles.statBar}>
            <div style={homeStyles.statItem}>
                <span style={homeStyles.statValue}>99.9%</span>
                <span style={homeStyles.statLabel}>Detection Accuracy</span>
            </div>
            <div style={homeStyles.statItem}>
                <span style={homeStyles.statValue}>FLASK/ML</span>
                <span style={homeStyles.statLabel}>Backend Technology</span>
            </div>
            <div style={homeStyles.statItem}>
                <span style={homeStyles.statValue}>CSV</span>
                <span style={homeStyles.statLabel}>Input Format</span>
            </div>
        </div>
    </div>
);

// =================================================================
// 2. PREDICTION VIEW (The Core Functionality - formerly PredictionPortal)
// =================================================================
const PredictionView = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('Ready to analyze data. Please upload a network traffic CSV file.');
    const [isError, setIsError] = useState(false);
    const [stats, setStats] = useState(null);

    const handleFileChange = (event) => {
        setIsError(false);
        setStats(null);
        const file = event.target.files[0];
        if (file && file.name.endsWith('.csv')) {
            setSelectedFile(file);
            setMessage(`File selected: ${file.name}`);
        } else {
            setSelectedFile(null);
            setMessage('Error: Please select a valid CSV file.');
            setIsError(true);
        }
    };

    const handleFileUpload = async () => {
        if (!selectedFile || isLoading) return;

        const formData = new FormData();
        formData.append('file', selectedFile);

        setIsLoading(true);
        setIsError(false);
        setStats(null);
        setMessage('Analyzing data... This may take a moment.');

        try {
            const response = await axios.post(FLASK_API_URL, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                responseType: 'blob',
            });

            // Handle successful response (Download the CSV)
            const contentDisposition = response.headers['content-disposition'];
            let filename = 'classified_packets.csv';

            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?(.+)"?$/);
                if (filenameMatch && filenameMatch[1]) { filename = filenameMatch[1]; }
            }

            // Trigger download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            setMessage(`Analysis complete! Classified file downloaded. Filename: ${filename}`);
            setStats({ processed: true, filename: filename });

        } catch (error) {
            let errorMessage = 'An unknown network or server error occurred.';
            if (error.code === 'ERR_NETWORK') {
                errorMessage = 'Network Error: Cannot connect to Flask backend. Is the server running on http://127.0.0.1:5000?';
            } else if (error.response) {
                const errorBlob = error.response.data;
                const errorText = await new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.readAsText(errorBlob);
                });

                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.error || errorMessage;
                } catch {
                    errorMessage = `HTTP Error ${error.response.status}: ${error.response.statusText}. Check server console.`;
                }
            }

            setMessage(`Prediction Failed: ${errorMessage}`);
            setIsError(true);
            console.error('API Error:', error);
        } finally {
            setIsLoading(false);
            setSelectedFile(null);
            const input = document.getElementById('file-upload-input');
            if(input) input.value = '';
        }
    };

    return (
        <div style={predictStyles.card}>
            <h2 style={predictStyles.title}>Batch Threat Analysis Portal</h2>
            <p style={predictStyles.subtitle}>Upload your network traffic log (CSV) for ML-driven classification.</p>

            {/* Message Box */}
            <div
                style={{
                    ...predictStyles.messageBox,
                    color: isError ? '#f87171' : '#10b981',
                    borderColor: isError ? '#f87171' : '#10b981',
                }}
            >
                {message}
            </div>

            {/* File Input */}
            <label htmlFor="file-upload-input" style={predictStyles.fileInputLabel}>
                <input
                    type="file"
                    id="file-upload-input"
                    accept=".csv"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    disabled={isLoading}
                />
                <span style={predictStyles.fileInputText}>
                    {selectedFile ? `File Selected: ${selectedFile.name}` : 'Click to Select CSV File'}
                </span>
            </label>

            {/* Run Prediction Button */}
            <button
                onClick={handleFileUpload}
                disabled={!selectedFile || isLoading || isError}
                style={{
                    ...predictStyles.button,
                    backgroundColor: (isLoading || !selectedFile || isError) ? '#374151' : '#10b981',
                    cursor: (isLoading || !selectedFile || isError) ? 'not-allowed' : 'pointer',
                    boxShadow: (isLoading || !selectedFile || isError) ? 'none' : '0 4px 10px rgba(16, 185, 129, 0.4)',
                }}
            >
                {isLoading ? 'PROCESSING...' : 'RUN PREDICTION'}
            </button>

            {isLoading && <SimpleLoader />}

            {/* Statistics Summary */}
            {stats && (
                <div style={predictStyles.statsBox}>
                    <h3 style={predictStyles.statsTitle}>Analysis Complete!</h3>
                    <p>File **{stats.filename}** was processed successfully.</p>
                    <p style={predictStyles.downloadHint}>The classified CSV file was generated and downloaded.</p>
                </div>
            )}
        </div>
    );
};

// =================================================================
// 3. MAIN APPLICATION ROUTER
// =================================================================
function App() {
    const [view, setView] = useState('home'); // 'home' or 'predict'

    const renderView = () => {
        switch (view) {
            case 'home':
                return <HomeView setView={setView} />;
            case 'predict':
                return <PredictionView />;
            default:
                return <HomeView setView={setView} />;
        }
    };

    return (
        <div style={styles.container}>
            {/* Global Styles */}
            <style>{`
                body { background-color: #0d131f; color: #e5e7eb; font-family: 'Inter', sans-serif; }
            `}</style>

            {/* Header / Navigation Bar */}
            <header style={styles.header}>
                <div style={styles.logo}>🛡️ CSTD Analyzer</div>
                <nav>
                    <button
                        onClick={() => setView('home')}
                        style={view === 'home' ? styles.navButtonActive : styles.navButton}
                    >
                        Home
                    </button>
                    <button
                        onClick={() => setView('predict')}
                        style={view === 'predict' ? styles.navButtonActive : styles.navButton}
                    >
                        Analyze Data
                    </button>
                </nav>
            </header>

            {/* Main Content Area */}
            <main style={styles.mainContent}>
                {renderView()}
            </main>

            <div style={styles.note}>
                <p>⚠️ **Note:** Ensure your Flask backend is running on port 5000.</p>
            </div>
        </div>
    );
}

// =================================================================
// STYLES
// =================================================================

// --- Global App Styles ---
const styles = {
    container: { fontFamily: 'Inter, sans-serif', minHeight: '100vh' },
    header: {
        backgroundColor: '#1f2937',
        padding: '15px 30px',
        borderBottom: '2px solid #374151',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    logo: {
        fontSize: '1.8rem',
        fontWeight: '700',
        color: '#10b981',
        letterSpacing: '0.05em'
    },
    navButton: {
        backgroundColor: 'transparent',
        color: '#9ca3af',
        border: 'none',
        padding: '8px 15px',
        marginRight: '10px',
        fontSize: '1rem',
        cursor: 'pointer',
        borderRadius: '6px',
        transition: 'all 0.2s',
    },
    navButtonActive: {
        backgroundColor: '#10b981',
        color: '#1f2937',
        border: 'none',
        padding: '8px 15px',
        marginRight: '10px',
        fontSize: '1rem',
        cursor: 'pointer',
        borderRadius: '6px',
        fontWeight: 'bold',
    },
    mainContent: {
        padding: '40px 20px',
    },
    note: {
        marginTop: '50px',
        fontSize: '0.75rem',
        color: '#9ca3af',
        textAlign: 'center'
    }
};

// --- Home View Styles ---
const homeStyles = {
    container: {
        textAlign: 'center',
        padding: '100px 20px',
        maxWidth: '800px',
        margin: '0 auto',
    },
    title: {
        fontSize: '3rem',
        fontWeight: '900',
        color: '#e5e7eb',
        marginBottom: '10px',
        textShadow: '0 0 10px rgba(16, 185, 129, 0.3)',
    },
    subtitle: {
        fontSize: '1.2rem',
        color: '#9ca3af',
        marginBottom: '40px',
    },
    button: {
        backgroundColor: '#10b981',
        color: '#0d131f',
        padding: '15px 40px',
        fontSize: '1.2rem',
        fontWeight: 'bold',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        boxShadow: '0 5px 15px rgba(16, 185, 129, 0.5)',
        transition: 'all 0.3s',
    },
    statBar: {
        marginTop: '80px',
        display: 'flex',
        justifyContent: 'space-around',
        backgroundColor: '#1f2937',
        padding: '20px',
        borderRadius: '12px',
        border: '1px solid #374151',
    },
    statItem: {
        textAlign: 'center',
    },
    statValue: {
        display: 'block',
        fontSize: '1.8rem',
        fontWeight: '700',
        color: '#34d399',
        marginBottom: '5px',
    },
    statLabel: {
        display: 'block',
        fontSize: '0.8rem',
        color: '#9ca3af',
        textTransform: 'uppercase',
    }
};

// --- Prediction View Styles (for the core functionality) ---
const predictStyles = {
    card: {
        padding: '40px',
        maxWidth: '550px',
        margin: '0 auto',
        backgroundColor: '#1f2937',
        borderRadius: '12px',
        textAlign: 'center',
        boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
        border: '1px solid #374151'
    },
    title: {
        fontSize: '1.75rem',
        fontWeight: '700',
        color: '#e5e7eb',
        marginBottom: '5px',
    },
    subtitle: {
        fontSize: '0.9rem',
        color: '#9ca3af',
        marginBottom: '30px'
    },
    messageBox: {
        minHeight: '40px',
        padding: '15px',
        marginBottom: '20px',
        borderRadius: '8px',
        fontWeight: '600',
        fontSize: '0.9rem',
        border: '1px solid',
        backgroundColor: '#d1fae520',
    },
    fileInputLabel: {
        display: 'block',
        padding: '15px 20px',
        borderRadius: '8px',
        backgroundColor: '#374151',
        border: '2px dashed #4b5563',
        color: '#e5e7eb',
        cursor: 'pointer',
        textAlign: 'center',
        marginBottom: '20px',
        transition: 'background-color 0.2s'
    },
    fileInputText: {
        fontWeight: '500',
        fontSize: '1.0rem'
    },
    button: {
        padding: '14px 30px',
        fontSize: '1.1rem',
        color: '#0d131f',
        border: 'none',
        borderRadius: '8px',
        marginTop: '15px',
        fontWeight: '800',
        letterSpacing: '0.05em',
        transition: 'all 0.3s'
    },
    statsBox: {
        marginTop: '30px',
        padding: '20px',
        backgroundColor: '#2c3e50',
        borderRadius: '8px',
        textAlign: 'left',
        borderLeft: '4px solid #10b981',
        fontSize: '0.9rem',
        color: '#e5e7eb'
    },
    statsTitle: {
        fontSize: '1.1rem',
        marginBottom: '10px',
        color: '#10b981',
        borderBottom: '1px dashed #374151',
        paddingBottom: '5px'
    },
    downloadHint: {
        marginTop: '10px',
        fontStyle: 'italic',
        color: '#a0aec0'
    }
};

export default App;