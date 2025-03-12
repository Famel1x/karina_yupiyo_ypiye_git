document.getElementById('sendData').addEventListener('click', async () => {
  try {
    const tabs = await chrome.tabs.query({});
    
    const contents = await Promise.all(
      tabs.map(async (tab) => {
        // Проверяем URL на принадлежность к защищенным схемам
        const blockedSchemes = ['chrome:', 'edge:', 'opera:', 'brave:', 'about:', 'vivaldi:'];
        const isProtected = blockedSchemes.some(scheme => tab.url.startsWith(scheme));
        
        if (isProtected) {
          return {
            url: tab.url,
            title: tab.title,
            content: 'Protected system page',
            error: 'EXTENSION_POLICY_BLOCK'
          };
        }

        try {
          const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => document.body?.innerText || 'Empty content'
          });
          
          return {
            url: tab.url,
            title: tab.title,
            content: result[0]?.result,
            error: null
          };
          
        } catch (error) {
          return {
            url: tab.url,
            title: tab.title,
            content: 'Content retrieval failed',
            error: error.message
          };
        }
      })
    );

    // Отправка данных на сервер
    const response = await fetch('http://localhost:5000/api', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json; charset=UTF-8' 
      },
      body: JSON.stringify({
        tabs: contents,
        total: contents.length
      })
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    // Отображение результата
    const data = await response.json();
    const resultHtml = `
      <body>
        <h1>Отправлено вкладок: ${data.total}</h1>
        <h2>Успешно сохранено: ${data.saved}</h2>
        ${data.skipped ? `<h3>Пропущено системных страниц: ${data.skipped}</h3>` : ''}
        ${data.errors ? `<h3>Ошибки сохранения: ${data.errors.length}</h3>` : ''}
      </body>
    `;
    
    const blob = new Blob(['\uFEFF' + resultHtml], {type: 'text/html; charset=UTF-8'});
    chrome.tabs.create({ url: URL.createObjectURL(blob) });

  } catch (error) {
    alert('Ошибка: ' + error.message);
  }
});