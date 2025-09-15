# Pixel Collab Game - Frontend

A simple collaborative pixel drawing application built with React, Tailwind CSS, and Zustand.

## Features

- 🎨 32x32 pixel canvas for drawing
- 🖌️ Color palette with 15 predefined colors
- 🖱️ Click and drag to draw pixels
- 🧹 Clear canvas functionality
- 📱 Responsive design
- 🔄 State management with Zustand
- 🎯 Ready for backend integration with Taubyte

## Tech Stack

- **React** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **JavaScript** - Programming language

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to the local development URL (usually `http://localhost:5173`)

## How to Use

1. Select a color from the color palette
2. Click and drag on the canvas to draw pixels
3. Use the "Clear Canvas" button to start over
4. Each pixel can be colored independently

## Project Structure

```
src/
├── components/
│   ├── PixelCanvas.jsx    # Main drawing canvas component
│   └── ColorPalette.jsx   # Color selection component
├── store/
│   └── canvasStore.js     # Zustand store for state management
├── App.jsx                # Main application component
├── main.jsx              # Application entry point
└── index.css             # Global styles with Tailwind
```

## Future Enhancements

This frontend is designed to be easily integrated with a backend built with Taubyte. The store includes methods for:
- Loading pixel data from the server
- Sending pixel updates to the server
- Real-time collaboration features

## Development

- Run `npm run dev` for development
- Run `npm run build` to build for production
- Run `npm run preview` to preview the production build