from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import re
import time
import logging

app = Flask(__name__)
CORS(app, resources={r"/api": {"origins": "*"}})  # Для безопасности укажите конкретный домен

SAVE_DIR = "saved_pages"
os.makedirs(SAVE_DIR, exist_ok=True)

# Настройка логирования
logging.basicConfig(
    filename='server.log',
    level=logging.INFO,
    format='%(asctime)s %(levelname)s: %(message)s'
)

def sanitize_filename(name: str) -> str:
    name = re.sub(r'[\\/*?:"<>|\x00-\x1F]', '_', name)
    name = re.sub(r'\s+', ' ', name).strip()  # Заменяем множественные пробелы
    return name[:100] or 'unnamed'

@app.route('/api', methods=['POST'])
def save_pages():
    errors = []
    saved = 0
    
    try:
        data = request.json
        if not data or 'tabs' not in data:
            return jsonify({"error": "Invalid data format"}), 400
            
        for index, tab in enumerate(data['tabs']):
            try:
                # Пропускаем системные страницы
                if tab.get('error') == 'EXTENSION_POLICY_BLOCK':
                    logging.info(f"Skipped system page: {tab.get('url')}")
                    continue
                # Генерируем уникальное имя файла
                timestamp = int(time.time())
                title_clean = sanitize_filename(tab.get('title', 'no-title'))
                url_clean = sanitize_filename(tab.get('url', 'no-url').split('//')[-1].replace('/', '_'))
                
                filename = f"{timestamp}_{index}_{title_clean}_{url_clean}.txt"
                filepath = os.path.join(SAVE_DIR, filename)
                
                # Сохраняем даже пустое содержимое с информацией об ошибке
                content = tab.get('content', '')
                if tab.get('error'):
                    content = f"Ошибка получения содержимого: {tab['error']}\n\n{content}"
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                saved += 1
                
            except Exception as e:
                errors.append({
                    "url": tab.get('url'),
                    "error": str(e),
                    "timestamp": time.time()
                })
                logging.error(f"Error saving {tab.get('url')}: {str(e)}")

        return jsonify({
                "status": "success",
                "total": len(data['tabs']),
                "saved": saved,
                "skipped": len([t for t in data['tabs'] if t.get('error') == 'EXTENSION_POLICY_BLOCK']),
                "errors": errors
            })

    except Exception as e:
        logging.exception("Critical error in save_pages")
        return jsonify({
                "status": "success",
                "total": len(data['tabs']),
                "saved": saved,
                "skipped": len([t for t in data['tabs'] if t.get('error') == 'EXTENSION_POLICY_BLOCK']),
                "errors": errors
            }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)