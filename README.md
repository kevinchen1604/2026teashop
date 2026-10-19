# 金茶伍班級飲料團

依照 `menu.jpg` 製作的班級點餐網站，分為點餐頁和訂單狀況頁。選擇容量、茶底、甜度、冰量、加料與數量時會即時計算價格。

## Google Sheet 設定

Apps Script 接收端位於 [`apps-script/Code.gs`](apps-script/Code.gs)。部署一次即可建立名稱為「2026手搖飲點餐記錄」的試算表，標題列為「訂單編號、送出時間、姓名、飲料明細、總金額」。

1. 使用 Google 帳號登入 [script.google.com](https://script.google.com)，新增 Apps Script 專案。
2. 將 `apps-script/Code.gs` 貼入編輯器並儲存，選取 `setup` 後按「執行」，依提示授權。執行記錄會顯示新試算表網址。
3. 選「部署」→「新增部署作業」→「網頁應用程式」；「執行身分」選自己，「誰可以存取」選「所有人」，部署並授權。
4. 將 `/exec` 網址貼到 `app-config.js` 的 `window.ORDER_API_URL`，例如：

   ```js
   window.ORDER_API_URL = "https://script.google.com/macros/s/部署識別碼/exec";
   ```

5. 若修改 Apps Script，請在「部署作業」編輯既有部署並選擇新版本。

未設定 Apps Script 網址時，網站會以示範模式將訂單存在目前瀏覽器的 localStorage，其他裝置看不到這些資料。正式使用前需完成上面的部署步驟。

## 本機預覽

以本機靜態伺服器開啟專案根目錄，例如 `python -m http.server 8000`，再瀏覽 `http://localhost:8000`。點餐頁上方顯示完整原始菜單圖片，下方提供表單與即時計價；「查看訂單」會顯示已送出的訂單。

## GitHub Pages

[開啟 GitHub Pages 點餐網站](https://kevinchen1604.github.io/2026teashop/)。`spec/` 僅供本機需求參考，不會納入 Git 追蹤。
