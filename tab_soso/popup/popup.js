document.getElementById('sendData').addEventListener('click', async () => {
    try {
      const tabs = await chrome.tabs.query({});
      
      const contents = await Promise.all(
        tabs.map(async (tab) => {
          if (tab.url.startsWith('chrome://')) return null;
          try {
            const result = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => document.body?.innerText || 'Нет содержимого'
            });
            return { 
              url: tab.url, 
              title: tab.title, 
              content: result[0]?.result 
            };
          } catch (error) {
            console.error(`Ошибка во вкладке ${tab.id}:`, error);
            return null;
          }
        })
      ).then(results => results.filter(Boolean));
  
      // Отправка данных на сервер
      const response = await fetch('http://localhost:5000/api', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json; charset=windows-1251' 
        },
        body: JSON.stringify(contents)
      });
  
      // Обработка ответа
      const data = await response.json();
  
      // Создание HTML с корректной кодировкой
      const htmlContent = `
        <html>
          <head>
            <meta charset="windows-1251">
          </head>
          <body>
            <h1>Успешно отправлено: ${contents.length} вкладок</h1>
            <pre>${JSON.stringify(data, null, 2)}</pre>
          </body>
        </html>
      `;
  
      // Создание Blob с явной кодировкой
      const blob = new Blob([htmlContent], { type: 'text/html; charset=windows-1251' });
      const url = URL.createObjectURL(blob);
      
      // Открытие в новой вкладке
      chrome.tabs.create({ url });
  
    } catch (error) {
      alert('Ошибка: ' + error.message);
    }
  });