import { decrypt } from 'nostr-tools/nip04'
import {
  dbChats,
  dbMessages,
  dbUnreadMessagesCount,
  dbUnreadMentionsCount,
  streamTag
} from '../query'
import { notify } from '../utils/notification'

export default function (store) {
  const myPub = store.state.keys.pub

  const setUnreadNotifications = async () => {
    store.commit(
      'setUnreadNotifications',
      await dbUnreadMentionsCount(
        myPub,
        store.state.lastNotificationRead
      )
    )
  }

  const setUnreadMessages = async peer => {
    await store.commit('setUnreadMessages', {
      peer,
      count: await dbUnreadMessagesCount(
        myPub,
        peer,
        store.state.lastMessageRead[peer] || 0
      )
    })
    if (!store.state.lastMessageRead[peer]) {
      return
    }
    let msgs = await dbMessages(myPub, peer, 1)
    let msg = msgs[0]
    let lastReadTime = store.state.lastMessageRead[peer]
    if (msg && msg.created_at && msg.created_at > lastReadTime) {
      let newMsgText = decrypt(store.state.keys.priv, peer, msg.content)
      let msgFrom = store.state.profilesCache[peer]?.name
      console.log('New message:', newMsgText, store, store.state.profilesCache)
      notify(msgFrom, newMsgText)
    }
  }

  if (myPub) streamTag('p', myPub, event => {
    if (event.kind === 1) setUnreadNotifications
    else if (event.kind === 4) setUnreadMessages(event.pubkey)
  })
  else {
    let interval = setInterval(() => {
      if (myPub) {
        streamTag('p', myPub, event => {
            if (event.kind === 1) setUnreadNotifications
            else if (event.kind === 4) setUnreadMessages(event.pubkey)
        })
        clearInterval(interval)
      }
    }, 2000)
  }

  setUnreadNotifications()
  dbChats(myPub).then(chats => { chats.forEach(chat => { setUnreadMessages(chat.peer) }) })

  store.subscribe(({type, payload}, state) => {
    switch (type) {
      case 'haveReadNotifications':
        setUnreadNotifications()
        break
      case 'haveReadMessage':
        setUnreadMessages(payload)
        break
    }
  })
}
