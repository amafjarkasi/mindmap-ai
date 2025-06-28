# AI Mind Map Generator

A powerful web application that uses OpenAI's GPT and GoJS to create detailed, interactive mind maps from user input.

## Features

- 🧠 **AI-Powered Generation**: Uses OpenAI's GPT to create comprehensive mind maps
- 🎨 **Beautiful Visualizations**: Leverages GoJS library for professional-looking diagrams
- 💬 **Chat Interface**: Intuitive chatbot interface for easy interaction
- 🎯 **Interactive Mind Maps**: Expandable/collapsible nodes for better navigation
- 📸 **Export Functionality**: Save mind maps as PNG images
- 🔒 **Secure**: API keys are stored locally in your browser
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- An OpenAI API key (get one from [OpenAI's website](https://platform.openai.com/api-keys))

### Installation

1. Clone or download this repository
2. Open `index.html` in your web browser
3. Enter your OpenAI API key in the provided field
4. Start creating mind maps!

### Usage

1. **Enter your API Key**: Input your OpenAI API key in the password field at the bottom of the chat section
2. **Type your topic**: Enter any topic or idea you want to create a mind map for
3. **Generate**: Click "Send" or press Enter to generate your mind map
4. **Explore**: Use the expand/collapse buttons to navigate through the mind map
5. **Export**: Click "Export PNG" to save your mind map as an image

### Example Topics

Try these example topics to get started:

- "Create a mind map about renewable energy"
- "Plan a marketing strategy for a new product"
- "Organize my thoughts about learning JavaScript"
- "Break down the components of artificial intelligence"
- "Plan a healthy lifestyle routine"

## Features in Detail

### Mind Map Visualization

- **Hierarchical Structure**: Organized in clear levels with visual hierarchy
- **Color Coding**: Different colors for different levels of information
- **Interactive Nodes**: Click to expand/collapse branches
- **Professional Layout**: Uses GoJS TreeLayout for optimal positioning

### Chat Interface

- **Real-time Interaction**: Chat with the AI assistant
- **Message History**: Keep track of your conversation
- **Error Handling**: Clear feedback for any issues

### Export Options

- **PNG Export**: High-quality image export
- **Custom Styling**: Professional appearance suitable for presentations

## Technical Details

### Built With

- **GoJS**: Professional diagramming library for interactive visualizations
- **OpenAI GPT-3.5-turbo**: AI model for generating mind map content
- **Vanilla JavaScript**: No framework dependencies for fast loading
- **CSS3**: Modern styling with gradients and animations

### File Structure

```
mindmap-ai/
├── index.html          # Main HTML file
├── styles.css          # Styling and layout
├── script.js           # Core JavaScript functionality
└── README.md           # This file
```

### Key Classes and Functions

- `MindMapGenerator`: Main application class
- `setupDiagram()`: Configures GoJS diagram
- `generateMindMap()`: Calls OpenAI API
- `createMindMap()`: Renders the generated data

## API Key Security

Your OpenAI API key is:
- Stored only in your browser's local storage
- Never transmitted to any server except OpenAI's API
- Only used for generating mind map content

## Browser Compatibility

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+

## Troubleshooting

### Common Issues

1. **"Please enter your OpenAI API key first"**
   - Solution: Make sure to enter a valid OpenAI API key in the password field

2. **"Sorry, there was an error generating the mind map"**
   - Check your internet connection
   - Verify your API key is correct and has available credits
   - Try with a simpler topic

3. **Mind map appears empty**
   - Click the "Center" button to focus on the content
   - Try refreshing the page

### API Limits

- Free tier: Limited requests per minute
- Paid tier: Higher rate limits available
- Each mind map generation uses approximately 1000-2000 tokens

## Customization

### Modifying Colors

Edit the color schemes in `script.js` in the `generateMindMap()` method:

```javascript
Root node colors: #667eea background, #4c51bf border
Level 1 colors: #48bb78 background, #38a169 border  
Level 2 colors: #ed8936 background, #dd6b20 border
Level 3+ colors: #9f7aea background, #805ad5 border
```

### Adjusting Layout

Modify the GoJS TreeLayout parameters in `setupDiagram()`:

```javascript
layout: $(go.TreeLayout, {
    arrangement: go.TreeLayout.ArrangementFixedRoots,
    angle: 0,
    layerSpacing: 50,
    nodeSpacing: 10
})
```

## License

This project is open source and available under the MIT License.

## Contributing

Feel free to submit issues, fork the repository, and create pull requests for any improvements.

## Support

If you encounter any issues or have questions:
1. Check the troubleshooting section above
2. Review the browser console for error messages
3. Ensure your OpenAI API key is valid and has credits

## Future Enhancements

Potential features for future versions:
- Multiple export formats (SVG, PDF)
- Custom node shapes and styles
- Collaborative editing
- Save/load mind maps
- Integration with other AI models
- Dark mode theme

---

**Happy Mind Mapping!** 🎉
