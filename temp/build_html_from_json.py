import json
import html

# Read the JSON data
with open('cards_new.json', 'r', encoding='utf-8') as file:
    accounts = json.load(file)

# Generate HTML content
html_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TikTok Accounts Directory</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 40px 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #fe2c55 0%, #25f4ee 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }

        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            font-weight: 700;
        }

        .header p {
            font-size: 1.1em;
            opacity: 0.95;
        }

        .stats {
            background: #f8f9fa;
            padding: 20px 40px;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 15px;
        }

        .stats-badge {
            background: #fe2c55;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 600;
        }

        .filter-buttons {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        .filter-btn {
            padding: 8px 16px;
            border: 2px solid #e0e0e0;
            background: white;
            border-radius: 20px;
            cursor: pointer;
            transition: all 0.3s;
            font-weight: 500;
        }

        .filter-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .filter-btn.active {
            background: #fe2c55;
            border-color: #fe2c55;
            color: white;
        }

        .search-box {
            padding: 12px 20px;
            border: 2px solid #e0e0e0;
            border-radius: 25px;
            width: 250px;
            font-size: 14px;
            transition: all 0.3s;
        }

        .search-box:focus {
            outline: none;
            border-color: #fe2c55;
            box-shadow: 0 0 0 3px rgba(254,44,85,0.1);
        }

        .accounts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            padding: 40px;
        }

        .account-card {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 12px;
            padding: 20px;
            transition: all 0.3s;
            cursor: pointer;
            text-decoration: none;
            color: inherit;
            display: block;
        }

        .account-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
            border-color: #fe2c55;
        }

        .account-handle {
            font-size: 1.2em;
            font-weight: 600;
            color: #fe2c55;
            margin-bottom: 8px;
            font-family: monospace;
        }

        .account-title {
            font-size: 1em;
            color: #666;
            margin-bottom: 12px;
        }

        .account-tags {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .tag {
            background: #f0f0f0;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 0.75em;
            font-weight: 500;
            color: #666;
        }

        .tag.male {
            background: #667eea;
            color: white;
        }

        .tag.female {
            background: #f093fb;
            color: white;
        }

        .no-results {
            text-align: center;
            padding: 60px;
            color: #999;
            font-size: 1.2em;
        }

        @media (max-width: 768px) {
            .accounts-grid {
                grid-template-columns: 1fr;
                padding: 20px;
            }
            
            .header h1 {
                font-size: 1.8em;
            }
            
            .stats {
                flex-direction: column;
                align-items: stretch;
            }
            
            .search-box {
                width: 100%;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎵 TikTok Accounts Directory</h1>
            <p>Direct links to TikTok profiles</p>
        </div>
        
        <div class="stats">
            <div class="stats-badge" id="accountCount">Loading accounts...</div>
            <div class="filter-buttons">
                <button class="filter-btn active" data-filter="all">All</button>
                <button class="filter-btn" data-filter="male">👨 Male</button>
                <button class="filter-btn" data-filter="female">👩 Female</button>
            </div>
            <input type="text" class="search-box" placeholder="Search by handle or name..." id="searchInput">
        </div>
        
        <div class="accounts-grid" id="accountsGrid"></div>
    </div>

    <script>
        const accountsData = """ + json.dumps(accounts) + """;
        
        let currentFilter = 'all';
        let currentSearch = '';
        
        function renderAccounts() {
            const grid = document.getElementById('accountsGrid');
            const filtered = accountsData.filter(account => {
                // Filter by gender
                if (currentFilter !== 'all') {
                    if (!account.tags.includes(currentFilter)) return false;
                }
                
                // Filter by search
                if (currentSearch) {
                    const searchLower = currentSearch.toLowerCase();
                    return account.handle.toLowerCase().includes(searchLower) || 
                           account.title.toLowerCase().includes(searchLower);
                }
                
                return true;
            });
            
            if (filtered.length === 0) {
                grid.innerHTML = '<div class="no-results">😕 No accounts found</div>';
                document.getElementById('accountCount').textContent = `0 accounts`;
                return;
            }
            
            document.getElementById('accountCount').textContent = `${filtered.length} accounts (${Math.round(filtered.length/accountsData.length*100)}%)`;
            
            grid.innerHTML = filtered.map(account => {
                const tagsHtml = account.tags.map(tag => 
                    `<span class="tag ${tag === 'male' ? 'male' : tag === 'female' ? 'female' : ''}">${tag}</span>`
                ).join('');
                
                return `
                    <a href="https://www.tiktok.com/@${account.handle}" target="_blank" class="account-card">
                        <div class="account-handle">@${escapeHtml(account.handle)}</div>
                        <div class="account-title">${escapeHtml(account.title)}</div>
                        <div class="account-tags">${tagsHtml}</div>
                    </a>
                `;
            }).join('');
        }
        
        function escapeHtml(str) {
            return str.replace(/[&<>]/g, function(m) {
                if (m === '&') return '&amp;';
                if (m === '<') return '&lt;';
                if (m === '>') return '&gt;';
                return m;
            });
        }
        
        // Set up event listeners
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.dataset.filter;
                renderAccounts();
            });
        });
        
        document.getElementById('searchInput').addEventListener('input', (e) => {
            currentSearch = e.target.value;
            renderAccounts();
        });
        
        // Initial render
        renderAccounts();
    </script>
</body>
</html>
"""

# Write the HTML file
with open('tiktok_accounts.html', 'w', encoding='utf-8') as file:
    file.write(html_content)

print("✅ HTML file created successfully: tiktok_accounts.html")
print(f"📊 Total accounts processed: {len(accounts)}")