import express from "express";
import cors from "cors";
import morgan from "morgan";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promises as fs } from "fs";
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let wordsList;
try {
    const filePath = join(__dirname, 'public', 'words.txt');
    wordsList = readFileSync(filePath, 'utf-8').split('\n').map(word => word.trim());
    console.log('Words loaded successfully:', wordsList.length, 'words');
} catch (err) {
    console.error('Error reading words file:', err);
    wordsList = [];
}



// Initialize Express app
const app = express();

// CORS configuration for production
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? [process.env.FRONTEND_URL, /\.vercel\.app$/, /\.vercel\.com$/]
        : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions)); 
app.use(morgan("dev"));
app.use(express.json());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(join(__dirname, '../frontend/dist')));
}

function generateDailyNumber() {
    const maxRange = 14855;
    const today = new Date().toISOString().split('T')[0];
    let hash = 0;
    for (let i = 0; i < today.length; i++) {
        hash = (hash * 31 + today.charCodeAt(i)) % maxRange;
    }
    return hash;
}

let test = wordsList[generateDailyNumber()];

function occurance(word) {
    let occur = {};
    for (let i in word) {
        if (word[i] in occur) {
            occur[word[i]]++;
        } else {
            occur[word[i]] = 1;
        }
    }
    return occur;
}

function initOccurance(word) {
    let occur = {};
    for (let i in word) {
        if (word[i] in occur) {
            continue;
        } else {
            occur[word[i]] = 0;
        }
    }
    return occur;
}

function handle(word) {
    let position = {};
    const testOccur = occurance(test);
    let wordOccur = initOccurance(word);

    for (let i in word) {
        if (word[i] === test[i]) {
            if (testOccur[word[i]] === wordOccur[word[i]]) {
                for (let key in position) {
                    if (word[key] === word[i] && position[key] === "position") {
                        delete position[key];
                        position[i] = "correct";
                    }
                }
            } else {
                position[i] = "correct";
                wordOccur[word[i]]++;
            }
        } else {
            for (let j = 0; j < 5; j++) {
                if (word[i] === test[j]) {
                    if (testOccur[word[i]] > wordOccur[word[i]]) {
                        position[i] = "position";
                        wordOccur[word[i]]++;
                        break;
                    }
                }
            }
        }
    }
    return position;
}

// Routes
app.get("/", (req, res) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            res.sendFile(join(__dirname, '../frontend/dist/index.html'));
        } else {
            res.status(200).json({ 
                status: "success", 
                message: "Wordle API is running!",
                endpoints: {
                    test: "/api/test",
                    word: "/api/word (POST)"
                }
            });
        }
    } catch (error) {
        console.error('Root route error:', error);
        res.status(500).json({ status: "error", message: error.message });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});


app.post("/api/word", async (req, res) => {
    try {
        const { word } = req.body;
        
        if (!word) {
            return res.status(400).json({ 
                status: "error", 
                message: "Missing word in request body" 
            });
        }

        
        console.log('Current test word:', test);

        const isValid = wordsList.includes(word.trim());
        const position = isValid ? handle(word) : {};

        return res.status(200).json({
            status: "success",
            message: "Word processed",
            wordFound: isValid,
            answer: position
        });
    } catch (error) {
        console.error('Word route error:', error);
        return res.status(500).json({ 
            status: "error", 
            message: error.message 
        });
    }
});

// Catch all handler for production (SPA routing)
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
        res.sendFile(join(__dirname, '../frontend/dist/index.html'));
    });
}

// Error handling for undefined routes (development)
app.use((req, res) => {
    res.status(404).json({ 
        status: "error",
        message: `Route ${req.originalUrl} not found`
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Global error:', error);
    res.status(500).json({ 
        status: "error",
        message: error.message 
    });
});

// Use PORT from environment or default to 3000
const PORT = process.env.PORT || 3000;

// Start server only if not in Vercel environment
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}

// Default export for Vercel (must be at top level)
export default app;