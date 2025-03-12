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

    // Отправка данных на сервер с UTF-8
    const response = await fetch('http://localhost:5000/api', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json; charset=UTF-8' 
      },
      body: JSON.stringify(contents)
    });

    // Обработка ответа
    const data = await response.json();

    // Создание HTML с BOM маркером для UTF-8
    const htmlContent = `
    <html>
        <head>
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        </head>
        <body>
            <h1>Успешно отправлено: ${contents.length} вкладок</h1>
            <pre>${JSON.stringify(data, null, 2)}</pre>
        </body>
    </html>
    `;

    // Явное кодирование в UTF-8 с BOM
    const encoder = new TextEncoder();
    const encodedContent = encoder.encode('\uFEFF' + htmlContent);

    // Создание Blob с явным указанием типа
    const blob = new Blob([encodedContent], { 
    type: 'text/html; charset=UTF-8' 
    });

    // Открытие в новой вкладке
    const url = URL.createObjectURL(blob);
    chrome.tabs.create({ url });

    } catch (error) {
    alert('Ошибка: ' + error.message);
  }
});