export const notify = function (title, body) {
  if (window.Notification && Notification.permission !== 'denied') {
    Notification.requestPermission(function (status) { // 请求权限
      if (status === 'granted') {
        // 弹出一个通知
        new Notification(title, {
          body
        })
        // 两秒后关闭通知
        // setTimeout(function () {
        //   n.close()
        // }, 2000)
      }
    })
  }
}
