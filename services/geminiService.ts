import { GoogleGenAI } from "@google/genai";

// Safe env access helper to prevent "process is not defined" error in browser
const getApiKey = () => {
    try {
        if (typeof process !== 'undefined' && process.env) {
            return process.env.API_KEY;
        }
    } catch (e) { }
    return '';
};

const apiKey = getApiKey();
// Initialize with fallback to prevent "API key must be set" error crashing the app on load
// This ensures the app loads UI even if API key is missing (AI features will fail gracefully later)
const ai = new GoogleGenAI({ apiKey: apiKey || 'fallback_key_for_ui_load' });

export const generateScript = async (topic: string, platform: string, contentType: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Buatlah naskah konten untuk platform ${platform}.
      Topik: ${topic}
      Jenis Konten: ${contentType}
      
      Gunakan gaya bahasa yang menarik, viral, dan sesuai dengan audiens Indonesia. Sertakan hook yang kuat di awal.
      Format output:
      - Hook
      - Isi (Poin-poin atau narasi)
      - Call to Action (CTA)`,
    });
    return response.text || "Gagal menghasilkan script.";
  } catch (error) {
    console.error("Error generating script:", error);
    return "Terjadi kesalahan saat menghubungi AI. Pastikan API Key valid.";
  }
};

export const analyzeContentPerformance = async (metrics: any, contentUrl: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analisis performa konten berikut ini:
      URL: ${contentUrl}
      Data Metriks: ${JSON.stringify(metrics)}
      
      Berikan evaluasi mendalam tentang mengapa konten ini performanya demikian. Berikan saran actionable untuk meningkatkan performa di masa depan. Gunakan Bahasa Indonesia yang profesional namun mudah dimengerti.`,
    });
    return response.text || "Gagal menganalisis konten.";
  } catch (error) {
    console.error("Error analyzing content:", error);
    return "Terjadi kesalahan saat analisis AI.";
  }
};

export const getChartInsights = async (data: any[]): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Berikut adalah data performa konten bulanan: ${JSON.stringify(data)}. 
        Berikan ringkasan singkat (maksimal 2 paragraf) tentang tren pertumbuhan dan apa yang harus difokuskan bulan depan.`
    });
    return response.text || "Tidak ada insight.";
  } catch (e) {
      return "Gagal memuat insight.";
  }
}