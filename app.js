const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs'); // Optional persistence

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

// In-memory storage for articles
let articles = [];
let nextId = 1;

// AddArticle Endpoint (POST /articles)
app.post('/articles', (req, res) => {
    const { title, content, tags } = req.body;

    if (!title || !content) {
        return res.status(400).json({ message: "Title and content are required." });
    }

    const article = {
        id: nextId++,
        title,
        content,
        tags: tags || [],
        created_at: new Date().toISOString()
    };

    articles.push(article);
    return res.status(201).json({ message: "Article added successfully.", article });
});

// SearchArticles Endpoint (GET /articles/search)
app.get('/articles/search', (req, res) => {
    const { keyword, tag, sortBy } = req.query;

    if (!keyword && !tag) {
        return res.status(400).json({ message: "Keyword or tag is required." });
    }

    // Filter articles by keyword or tag
    let filteredArticles = articles.filter(article => {
        const keywordMatch = keyword
            ? article.title.includes(keyword) || article.content.includes(keyword)
            : true;

        const tagMatch = tag
            ? article.tags.includes(tag)
            : true;

        return keywordMatch && tagMatch;
    });

    // Sort by relevance or date
    if (sortBy === 'relevance' && keyword) {
        filteredArticles.sort((a, b) => {
            const freq = (str, word) => (str.match(new RegExp(word, "gi")) || []).length;
            const aScore = freq(a.title, keyword) * 2 + freq(a.content, keyword);
            const bScore = freq(b.title, keyword) * 2 + freq(b.content, keyword);
            return bScore - aScore;
        });
    } else if (sortBy === 'date') {
        filteredArticles.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return res.json(filteredArticles);
});

// GetArticle Endpoint (GET /articles/:id)
app.get('/articles/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const article = articles.find(a => a.id === id);

    if (!article) {
        return res.status(404).json({ message: "Article not found." });
    }

    return res.json(article);
});

// Optional: Save articles to file (for persistence)
function saveArticles() {
    fs.writeFileSync('articles.json', JSON.stringify(articles, null, 2));
}

// Optional: Load articles from file
function loadArticles() {
    if (fs.existsSync('articles.json')) {
        articles = JSON.parse(fs.readFileSync('articles.json'));
        nextId = articles.length ? Math.max(...articles.map(a => a.id)) + 1 : 1;
    }
}

// Load articles on startup
loadArticles();

// Save articles on exit
process.on('exit', saveArticles);
process.on('SIGINT', () => {
    saveArticles();
    process.exit();
});

// Start the server
app.listen(PORT, () => {
    console.log(`Mini Search Engine running at http://localhost:${PORT}`);
});