// ====================================================================
// 1. SUPABASE CONFIGURATION - REPLACE WITH YOUR ACTUAL KEYS!
// ====================================================================
const SUPABASE_URL = 'https://qowjzbibbqtzqrybmgnr.supabase.com'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvd2p6YmliYnF0enFyeWJtZ25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MDEyNDMsImV4cCI6MjA3NjM3NzI0M30.7L8tw9TEqWL0DGXuPQFEKjNKQnJnDavxFxyzq78zcKY'; 

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const statusElement = document.getElementById('status-message');
const catalogList = document.getElementById('catalog-list');
const authorList = document.getElementById('author-list');
const updateContainer = document.getElementById('update-form-container');

// Helper to display messages in the dedicated status area
function displayStatus(message, isError = false) {
    statusElement.textContent = message;
    statusElement.className = isError ? 'message error' : 'message success';
}

// ====================================================================
// AUTHOR CRUD (R & C) - New Variety Feature
// ====================================================================

// READ AUTHORS
async function fetchAuthors() {
    authorList.innerHTML = '<p class="loading-text">Fetching author records...</p>';
    let { data: authors, error } = await supabase.from('Authors').select('*').order('LastName', { ascending: true });

    if (error) {
        authorList.innerHTML = `<p class="error-text">Error loading authors: ${error.message}</p>`;
        return;
    }

    if (authors.length === 0) {
        authorList.innerHTML = '<p>No authors found. Use the form above to add one!</p>';
        return;
    }

    const ul = document.createElement('ul');
    authors.forEach(author => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div>
                <strong>${author.LastName}, ${author.FirstName}</strong> 
                <small>ID: ${author.id} | ${author.Nationality || 'N/A'}</small>
            </div>
            `;
        ul.appendChild(li);
    });
    authorList.innerHTML = '';
    authorList.appendChild(ul);
}

// CREATE AUTHOR
document.getElementById('author-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    const newAuthor = {
        FirstName: document.getElementById('author-first-name').value,
        LastName: document.getElementById('author-last-name').value,
        Nationality: document.getElementById('author-nationality').value || null
    };

    const { error } = await supabase.from('Authors').insert([newAuthor]);

    if (error) {
        displayStatus(`Author Error: Could not add author. ${error.message}`, true);
    } else {
        displayStatus(`Author ${newAuthor.FirstName} ${newAuthor.LastName} added successfully.`);
        document.getElementById('author-form').reset();
        fetchAuthors(); // Refresh author list
    }
});


// ====================================================================
// BOOK CRUD (R, C, U, D)
// ====================================================================

// READ BOOKS (R)
async function fetchAndDisplayBooks() {
    catalogList.innerHTML = '<p class="loading-text">Fetching book catalog data...</p>';
    
    let { data: books, error } = await supabase
        .from('Books')
        .select(`
            id, Title, Genre, PublicationYear, AuthorID, 
            Authors ( FirstName, LastName ) 
        `).order('Title', { ascending: true }); // Order for better presentation

    if (error) {
        catalogList.innerHTML = `<p class="error-text">Error loading catalog: ${error.message}</p>`;
        return;
    }

    if (books.length === 0) {
        catalogList.innerHTML = '<p>The book catalog is empty. Insert data using the form above.</p>';
        return;
    }

    catalogList.innerHTML = '';
    const ul = document.createElement('ul');
    books.forEach(book => {
        const li = document.createElement('li');
        // Safely extract author name using the JOIN data
        const authorName = book.Authors 
            ? `${book.Authors.FirstName} ${book.Authors.LastName}` 
            : `Author ID: ${book.AuthorID} (Link Broken)`;
            
        li.innerHTML = `
            <div>
                <strong>${book.Title}</strong> 
                <small class="details">by ${authorName} | Genre: ${book.Genre} | Year: ${book.PublicationYear} | ID: ${book.id}</small>
            </div>
            <div class="actions">
                <button class="update-btn" onclick="showUpdateForm(${book.id}, '${book.Title}', '${book.Genre}', ${book.PublicationYear}, ${book.AuthorID})">EDIT</button>
                <button class="delete-btn" onclick="deleteBook(${book.id})">DELETE</button>
            </div>
        `;
        ul.appendChild(li);
    });
    catalogList.appendChild(ul);
}

// CREATE BOOK (C)
document.getElementById('book-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    const newBook = {
        Title: document.getElementById('title').value,
        Genre: document.getElementById('genre').value,
        PublicationYear: parseInt(document.getElementById('year').value),
        AuthorID: parseInt(document.getElementById('author-id').value) 
    };

    const { error } = await supabase.from('Books').insert([newBook]);

    if (error) {
        displayStatus(`Book Error (Foreign Key?): ${error.message}`, true);
        console.error('Insert Error:', error);
    } else {
        displayStatus(`Book "${newBook.Title}" (ID: ${newBook.id}) added successfully.`);
        document.getElementById('book-form').reset();
        fetchAndDisplayBooks();
    }
});


// DELETE BOOK (D)
async function deleteBook(bookId) {
    if (!confirm(`Confirm DELETION of Book ID: ${bookId}?`)) { return; }

    const { error } = await supabase
        .from('Books')
        .delete()
        .eq('id', bookId);

    if (error) {
        displayStatus(`Deletion Error: ${error.message}`, true);
    } else {
        displayStatus(`Book ID ${bookId} successfully DELETED.`);
        updateContainer.classList.add('hidden'); // Hide update form if it was showing
        fetchAndDisplayBooks();
    }
}


// UPDATE BOOK (U) - Form Display and Submission
function showUpdateForm(id, title, genre, year, authorId) {
    // Scroll to the update section for user convenience
    document.querySelector('.book-section').scrollIntoView({ behavior: 'smooth' });
    
    updateContainer.classList.remove('hidden');
    updateContainer.innerHTML = `
        <h3>✏️ Editing Book: ${title} (ID: ${id})</h3>
        <form id="update-book-form">
            <input type="text" id="edit-title" value="${title}" required>
            <input type="text" id="edit-genre" value="${genre}" required>
            <input type="number" id="edit-year" value="${year}" min="1000" max="2025" required>
            <input type="number" id="edit-author-id" value="${authorId}" placeholder="Author ID" required>
            <div class="actions">
                <button type="submit">💾 Save Changes</button>
                <button type="button" class="cancel-btn" onclick="updateContainer.classList.add('hidden'); displayStatus('');">Cancel Edit</button>
            </div>
        </form>
    `;

    document.getElementById('update-book-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const updatedData = {
            Title: document.getElementById('edit-title').value,
            Genre: document.getElementById('edit-genre').value,
            PublicationYear: parseInt(document.getElementById('edit-year').value),
            AuthorID: parseInt(document.getElementById('edit-author-id').value)
        };

        const { error } = await supabase
            .from('Books')
            .update(updatedData)
            .eq('id', id);

        if (error) {
            displayStatus(`Update Error: ${error.message}`, true);
        } else {
            displayStatus(`Book ID ${id} successfully UPDATED.`);
            updateContainer.classList.add('hidden');
            fetchAndDisplayBooks();
        }
    });
}

// ====================================================================
// INITIALIZATION 
// ====================================================================
document.addEventListener('DOMContentLoaded', () => {
    fetchAuthors();
    fetchAndDisplayBooks();
});
