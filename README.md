# Instagram Follower Diff

A privacy-focused tool to compare your Instagram followers and following lists. Find out who doesn't follow you back—all processing happens locally in your browser.

## Features

- **Privacy First**: Your data never leaves your browser
- **Detailed Analysis**: See who doesn't follow you back, who you don't follow back, and mutual followers
- **Search & Filter**: Quickly find specific users
- **Chrome Extension**: Optionally automate follow/unfollow actions (use responsibly)

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/korvol-tech/instagram-followe-diff.git
cd instagram-followe-diff

# Install dependencies for the web app
cd web
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Getting Your Instagram Data

1. Open Instagram app or website
2. Go to **Settings → Accounts Center → Your information and permissions**
3. Select **Export your information**
4. Choose your Instagram account and select **Export to device**
5. Click **Customize information** and select only **Followers and following**
6. Set format to **JSON** and date range to **All time**
7. Click **Start export** and wait for the email notification
8. Download and unzip the file
9. Upload `followers_and_following/followers_1.json` and `followers_and_following/following.json` to the app

## Chrome Extension (Optional)

The Chrome extension allows you to automate follow/unfollow actions directly from the web app.

### Building the Extension

```bash
cd extension
npm install
npm run build
```

### Installing the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `extension/dist` folder

### Using the Extension

1. Make sure you're logged into Instagram in your browser
2. Open the Instagram Follower Diff web app
3. Upload your files and view the results
4. When the extension is detected, you'll see action buttons to follow/unfollow users
5. The extension processes actions with delays to avoid rate limiting

**Important**: Use the extension responsibly. Excessive follow/unfollow actions may result in temporary restrictions on your Instagram account.

## Project Structure

```
instagram-followers/
├── web/                 # Next.js web application
│   ├── src/
│   │   ├── app/        # App router pages
│   │   ├── components/ # React components
│   │   └── lib/        # Utilities and types
│   └── package.json
├── extension/           # Chrome extension
│   ├── src/
│   │   ├── background.ts
│   │   ├── content.ts
│   │   └── popup.ts
│   └── package.json
├── shared/              # Shared types between web and extension
│   └── types/
└── vercel.json          # Vercel deployment config
```

## Contributing

Contributions are welcome! Here's how you can help:

### Reporting Issues

1. Check if the issue already exists in [GitHub Issues](https://github.com/korvol-tech/instagram-followe-diff/issues)
2. If not, create a new issue with:
   - A clear, descriptive title
   - Steps to reproduce the problem
   - Expected vs actual behavior
   - Browser and OS information
   - Screenshots if applicable

### Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Run tests and linting:
   ```bash
   cd web && npm run lint && npm run build
   cd ../extension && npm run lint && npm run build
   ```
5. Commit your changes with a descriptive message
6. Push to your fork and submit a Pull Request

### Development Guidelines

- Follow the existing code style
- Write meaningful commit messages
- Keep PRs focused on a single feature or fix
- Update documentation if needed

## Deployment

The web app is configured for Vercel deployment:

```bash
# Deploy to Vercel
vercel
```

Or connect your GitHub repository to Vercel for automatic deployments.

## License

MIT

## Disclaimer

This tool is for personal use only. Please respect Instagram's Terms of Service and use the automation features responsibly. The developers are not responsible for any actions taken against your account due to misuse of this tool.
