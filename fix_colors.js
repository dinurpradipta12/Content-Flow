const fs = require('fs');
let content = fs.readFileSync('pages/CarouselMaker.tsx', 'utf8');

// The goal is to aggressively replace red specific overrides in CarouselMaker.tsx with blue / theme specific equivalents

// Replace dark
content = content.replace(
    '.theme-dark .bg-red-50 { background-color: #450a0a !important; border-color: #7f1d1d !important; color: #fca5a5 !important; }',
    '.theme-dark .bg-red-50 { background-color: #1e3a8a !important; border-color: #1e40af !important; color: #93c5fd !important; }\n            .theme-dark .text-red-500, .theme-dark .text-red-600 { color: #93c5fd !important; }\n            .theme-dark .hover\\\\:bg-red-500:hover { background-color: #3b82f6 !important; }'
);

// Replace midnight
content = content.replace(
    '.theme-midnight .bg-red-50 { background-color: #4c1d95 !important; border-color: #5b21b6 !important; color: #ddd6fe !important; }',
    '.theme-midnight .bg-red-50 { background-color: #312e81 !important; border-color: #3730a3 !important; color: #a5b4fc !important; }\n            .theme-midnight .text-red-500, .theme-midnight .text-red-600 { color: #a5b4fc !important; }\n            .theme-midnight .hover\\\\:bg-red-500:hover { background-color: #4f46e5 !important; }'
);

// Pastel Green
content = content.replace(
    '.theme-pastel-green .bg-red-50 { background-color: #dcfce7 !important; border-color: #bbf7d0 !important; color: #166534 !important; }',
    '.theme-pastel-green .bg-red-50 { background-color: #dcfce7 !important; border-color: #bbf7d0 !important; color: #166534 !important; }\n            .theme-pastel-green .text-red-500, .theme-pastel-green .text-red-600 { color: #166534 !important; }\n            .theme-pastel-green .hover\\\\:bg-red-500:hover { background-color: #22c55e !important; }'
);

// Pastel Yellow
content = content.replace(
    '.theme-pastel-yellow .bg-red-50 { background-color: #fef9c3 !important; border-color: #fef08a !important; color: #854d0e !important; }',
    '.theme-pastel-yellow .bg-red-50 { background-color: #fef9c3 !important; border-color: #fef08a !important; color: #854d0e !important; }\n            .theme-pastel-yellow .text-red-500, .theme-pastel-yellow .text-red-600 { color: #854d0e !important; }\n            .theme-pastel-yellow .hover\\\\:bg-red-500:hover { background-color: #eab308 !important; }'
);

// Add text-red rules and hover rules to custom
content = content.replace(
    '.theme-custom .bg-red-50 { background-color: ${customColor}15 !important; border-color: ${customColor}44 !important; color: ${customColor} !important; }',
    '.theme-custom .bg-red-50 { background-color: ${customColor}15 !important; border-color: ${customColor}44 !important; color: ${customColor} !important; }\n            .theme-custom .text-red-500, .theme-custom .text-red-600 { color: ${customColor} !important; }\n            .theme-custom .hover\\\\:bg-red-500:hover { background-color: ${customColor} !important; }'
);

fs.writeFileSync('pages/CarouselMaker.tsx', content);

