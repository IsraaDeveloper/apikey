// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: 'https://reenai.netlify.app'
}));

app.use(express.json());
app.use(express.static('public'));

app.post('/chat', async (req, res) => {
    const { message } = req.body;
    if (!message) {
        return res.status(400).json({ error: 'Pesan tidak ditemukan' });
    }

    // Konfigurasi untuk model DeepSeek
    const model = "deepseek/deepseek-r1-distill-llama-70b:free";
    const title = "Reen Ai";
    const apiKey = "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";
    const openaiUrl = "https://openrouter.ai/api/v1/chat/completions";

    try {
        // Opsional: penundaan 2 detik
        await new Promise(resolve => setTimeout(resolve, 2000));

        const response = await axios.post(
            openaiUrl,
            {
                model: model,
                messages: [
                    { role: "user", content: message },
                    { role: "system", content: "Nama kamu adalah Reen AI. Kamu adalah AI yang dibuat dan dikembangkan oleh IsrajuI Muhajirin. Jawab pertanyaan dengan santai dan informatif dan berikan solusi terbaik jika tertapat masalah." }
                ],
                max_tokens: 50000,
                stream: true
            },
            {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://israjulmuhajirin.my.id",
                    "X-Title": title
                },
                responseType: "stream"
            }
        );

        let fullResponse = "";
        let buffer = "";

        response.data.on("data", (chunk) => {
            buffer += chunk.toString();

            // Pisahkan buffer menjadi baris-baris berdasarkan newline
            let lines = buffer.split("\n");

            // Simpan baris terakhir (yang mungkin tidak lengkap) ke buffer
            buffer = lines.pop();

            // Proses setiap baris yang lengkap
            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    const trimmedLine = line.replace("data: ", "").trim();

                    // Abaikan baris yang berisi "[DONE]"
                    if (trimmedLine === "[DONE]") {
                        continue;
                    }

                    try {
                        const jsonData = JSON.parse(trimmedLine);
                        if (jsonData.choices &&
                            jsonData.choices[0].delta &&
                            jsonData.choices[0].delta.content) {
                            fullResponse += jsonData.choices[0].delta.content;
                        }
                    } catch (err) {
                        console.error("Error parsing streaming chunk:", err);
                    }
                }
            }
        });

        response.data.on("end", () => {
            if (buffer.trim() !== "") {
                fullResponse += buffer;
            }
            if (fullResponse.trim() === "") {
                return res.json({ error: "Maaf, tidak ada respons dari AI. Silahkan coba lagi" });
            }
            return res.json({ response: fullResponse });
        });

        response.data.on("error", (err) => {
            console.error("Error during streaming:", err);
            return res.status(500).json({ error: "Terjadi kesalahan saat streaming respons AI." });
        });

    } catch (error) {
        console.error("Error memanggil AI:", error?.response?.data || error);
        return res.status(500).json({ error: "Maaf, terjadi kesalahan saat menghubungi AI. Silahkan coba lagi nanti" });
    }
});

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
