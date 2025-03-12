from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import re

app = Flask(__name__)
CORS(app)

SAVE_DIR = "saved_pages"
os.makedirs(SAVE_DIR, exist_ok=True)

def sanitize_filename(name: str) -> str:
    # Удаляем запрещенные символы: \ / : * ? " < > | 
    name = re.sub(r'[\\/*?:"<>|]', '_', name)
    # Укорачиваем имя до 100 символов и убираем пробелы в конце
    return name.strip()[:100]

@app.route('/api', methods=['POST'])
def save_pages():
    try:
        data = request.json
        for page in data:
            # Очищаем заголовок и URL от недопустимых символов
            title_clean = sanitize_filename(page['title'])
            url_clean = sanitize_filename(page['url'].split('//')[-1].replace('/', '_'))
            
            filename = f"{title_clean}_{url_clean}.txt"
            filepath = os.path.join(SAVE_DIR, filename)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(page['content'])
            print("Полученные данные:", page['content'][:100])
        
        return jsonify({"status": "Успешно", "saved_files": len(data)})
    
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)