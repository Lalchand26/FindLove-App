import { useEffect, useRef, useState } from "react"
import AgoraRTC from "agora-rtc-sdk-ng"

const VideoCallOverlay = ({ 
  channelName, 
  userId, 
  onCallEnd, 
  incomingCall = null, // 👈 NAYA: Agar call aa rahi to data
  onAcceptCall, // 👈 NAYA: Accept button ka function
  onRejectCall // 👈 NAYA: Reject button ka function
}) => {
  const [joined, setJoined] = useState(false)
  const [remoteUsers, setRemoteUsers] = useState({})
  const [error, setError] = useState(null)
  const [isRinging, setIsRinging] = useState(!!incomingCall) // 👈 NAYA: Ring state

  const clientRef = useRef(null)
  const localVideoRef = useRef(null)
  const isJoiningRef = useRef(false)
  const localAudioTrackRef = useRef(null)
  const localVideoTrackRef = useRef(null)
  const hasCalledEndRef = useRef(false)
  const mountedRef = useRef(true)
  const joinAttemptedRef = useRef(false)
  const ringtoneRef = useRef(null) // 👈 NAYA: Ringtone ke liye

  const APP_ID = import.meta.env.VITE_AGORA_APP_ID
  const TOKEN_URL = import.meta.env.VITE_SUPABASE_FUNCTION_URL // 👈 Localhost hatao

  // 1. Agora Client banao - same as before
  useEffect(() => {
    if (!clientRef.current) {
      console.log("Creating Agora client...")
      clientRef.current = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" })

      clientRef.current.on("user-published", async (user, mediaType) => {
        try {
          await clientRef.current.subscribe(user, mediaType)
          console.log("Remote user published:", user.uid, mediaType)
          if (mediaType === "video") {
            setRemoteUsers(prev => ({...prev, [user.uid]: user }))
          }
          if (mediaType === "audio") {
            user.audioTrack?.play()
          }
        } catch (error) {
          console.error("Subscribe error:", error)
        }
      })

      const handleUserLeft = (user) => {
        console.log("User left:", user.uid)
        setRemoteUsers(prev => {
          const updated = {...prev }
          delete updated[user.uid]
          return updated
        })
        // Agar dusra user call cut kare to apna bhi band karo
        if(Object.keys(remoteUsers).length <= 1) {
          safeEndCall()
        }
      }

      clientRef.current.on("user-unpublished", handleUserLeft)
      clientRef.current.on("user-left", handleUserLeft)
    }
  }, [])

  // 2. Ringtone Logic 👈 NAYA
  useEffect(() => {
    if (incomingCall && isRinging) {
      // Ringtone bajao
      ringtoneRef.current = new Audio('/ringtone.mp3')
      ringtoneRef.current.loop = true
      ringtoneRef.current.play().catch(e => console.log("Autoplay blocked:", e))
      
      // Browser notification
      if (Notification.permission === "granted") {
        new Notification(`${incomingCall.from_name} is calling...`, {
          icon: incomingCall.from_photo || '/logo.png',
          body: 'Tap to answer video call',
          tag: 'video-call'
        })
      }
    }
    
    return () => {
      // Ringtone band karo
      if (ringtoneRef.current) {
        ringtoneRef.current.pause()
        ringtoneRef.current = null
      }
    }
  }, [incomingCall, isRinging])

  // 3. Auto Join - Sirf outgoing call me, incoming me nahi
  useEffect(() => {
    mountedRef.current = true

    // 👇 Agar incoming call hai to join mat karo, Accept ka wait karo
    if (incomingCall) {
      console.log("Incoming call detected - waiting for accept")
      return
    }

    if (joinAttemptedRef.current) {
      console.log("StrictMode detected - already attempted, skipping")
      return
    }

    console.log("Outgoing call - joining now. Channel:", channelName, "User:", userId)

    if (!channelName ||!APP_ID) {
      setError("Missing channelName or APP_ID")
      setTimeout(() => safeEndCall(), 1500)
      return
    }

    if (clientRef.current) {
      joinAttemptedRef.current = true
      joinChannel()
    }

    return () => {
      mountedRef.current = false
      if (joinAttemptedRef.current && hasCalledEndRef.current) {
        cleanup()
      }
    }
  }, [channelName, incomingCall]) // 👈 incomingCall dependency add

  // 4. Accept Call Function 👈 NAYA
  const handleAcceptCall = async () => {
    setIsRinging(false) // Ring band
    if (ringtoneRef.current) {
      ringtoneRef.current.pause()
    }
    onAcceptCall?.() // Parent ko batao
    await joinChannel() // Ab join karo
  }

  // 5. Reject Call Function 👈 NAYA 
  const handleRejectCall = () => {
    setIsRinging(false)
    if (ringtoneRef.current) {
      ringtoneRef.current.pause()
    }
    onRejectCall?.() // Parent ko batao
    safeEndCall()
  }

  useEffect(() => {
    Object.values(remoteUsers).forEach(user => {
      if (user.videoTrack) {
        const element = document.getElementById(`remote-video-${user.uid}`)
        if (element) {
          user.videoTrack.play(element)
        }
      }
    })
  }, [remoteUsers])

  const joinChannel = async () => {
    if (isJoiningRef.current ||!clientRef.current ||!mountedRef.current) return
    isJoiningRef.current = true
    // 👇 Incoming call me channelName props se aayega
    const finalChannelName = (incomingCall?.channel_name || channelName).trim().substring(0, 64)

    try {
      console.log("1. Creating tracks...")
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks()
      if (!mountedRef.current) {
        audioTrack.close(); videoTrack.close(); return
      }

      localAudioTrackRef.current = audioTrack
      localVideoTrackRef.current = videoTrack
      if (localVideoRef.current) videoTrack.play(localVideoRef.current)

      console.log("3. Fetching token...")
      const uid = Number(userId) || Math.floor(Math.random() * 100000)
      const res = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelName: finalChannelName, uid: uid })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Token fetch failed")

      if (!mountedRef.current) return
      await client.setVideoEncoderConfiguration({ 
  codec: 'h264',
  width: 640,
  height: 480,
  frameRate: 15,
  bitrateMin: 400,
  bitrateMax: 800  // 👈 bandwidth badha diya
});

      console.log("5. Joining channel:", finalChannelName)

      await clientRef.current.join(APP_ID, finalChannelName, data.token, uid)
      await clientRef.current.publish([audioTrack, videoTrack])

      if (mountedRef.current) {
        setJoined(true)
        setError(null)
      }
    } catch (error) {
      console.error("Error joining:", error)
      if (mountedRef.current) {
        setError(error.message)
        setTimeout(() => safeEndCall(), 1500)
      }
    } finally {
      isJoiningRef.current = false
    }
  }

  const cleanup = async () => {
    try {
      isJoiningRef.current = false
      localAudioTrackRef.current?.stop()
      localAudioTrackRef.current?.close()
      localVideoTrackRef.current?.stop()
      localVideoTrackRef.current?.close()
      localAudioTrackRef.current = null
      localVideoTrackRef.current = null
      if (clientRef.current) {
        clientRef.current.removeAllListeners()
        await clientRef.current.leave()
      }
      setJoined(false)
      setRemoteUsers({})
    } catch (error) {
      console.error("Cleanup error:", error)
    }
  }

  const safeEndCall = () => {
    if (hasCalledEndRef.current) return
    hasCalledEndRef.current = true
    onCallEnd?.()
    cleanup()
  }

  // 👇 INCOMING CALL UI - Ring Screen
  if (isRinging && incomingCall) {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-gray-900 to-black flex-col items-center justify-center" style={{zIndex: 9999999}}>
        <div className="text-center">
          <img 
            src={incomingCall.from_photo || '/default-avatar.png'} 
            className="w-32 h-32 rounded-full mx-auto mb-6 border-4 border-white animate-pulse"
          />
          <h2 className="text-white text-3xl font-bold mb-2">{incomingCall.from_name}</h2>
          <p className="text-gray-300 text-xl mb-12">Video calling...</p>
          
          <div className="flex gap-8 justify-center">
            <button
              onClick={handleRejectCall}
              className="bg-red-600 hover:bg-red-700 w-20 h-20 rounded-full flex items-center justify-center"
            >
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" transform="rotate(135 10 10)"/>
              </svg>
            </button>
            <button
              onClick={handleAcceptCall}
              className="bg-green-600 hover:bg-green-700 w-20 h-20 rounded-full flex items-center justify-center animate-bounce"
            >
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 👇 NORMAL VIDEO CALL UI - Same as before
  return (
    <div className="fixed inset-0 bg-black flex flex-col" style={{zIndex: 9999999, width: '100vw', height: '100vh'}}>
      <div className="absolute inset-0" onClick={safeEndCall} style={{ zIndex: 1 }} />
      
      <div className="flex-1 relative" style={{ pointerEvents: 'none', zIndex: 2 }}>
        <div className="w-full h-full flex flex-wrap justify-center items-center gap-2">
          {error? (
            <div className="text-red-500 text-xl bg-black/80 p-4 rounded">Error: {error}</div>
          ) : Object.keys(remoteUsers).length > 0? (
            Object.values(remoteUsers).map(user => (
             <div key={user.uid} id={`remote-video-${user.uid}`} className="flex-1 min-w-[300px] h-full bg-gray-900 [&_video]:object-cover [&_video]:w-full [&_video]:h-full" />
            ))
          ) : (
            <div className="text-white text-lg">{joined? "Waiting for other user to join..." : "Connecting..."}</div>
          )}
        </div>
        <div ref={localVideoRef} className="absolute bottom-24 right-4 w-32 h-48 bg-gray-800 rounded-lg overflow-hidden border-2 border-white" style={{ zIndex: 10000000 }} />
      </div>

      <div className="bg-gray-900 p-4 flex justify-center gap-4" style={{zIndex: 10000001}} onClick={(e) => e.stopPropagation()}>
        <button onMouseDown={safeEndCall} className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-full font-bold text-lg" style={{minWidth: '120px'}}>
          END CALL
        </button>
      </div>
    </div>
  )
}

export default VideoCallOverlay
