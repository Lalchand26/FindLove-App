import { useEffect, useRef, useState } from "react"
import AgoraRTC from "agora-rtc-sdk-ng"

const VideoCallOverlay = ({
  channelName,
  userId,
  onCallEnd,
  incomingCall = null,
  onAcceptCall,
  onRejectCall
}) => {
  const [joined, setJoined] = useState(false)
  const [remoteUsers, setRemoteUsers] = useState({})
  const [error, setError] = useState(null)
  const [isRinging, setIsRinging] = useState(!!incomingCall)

  const clientRef = useRef(null)
  const localVideoRef = useRef(null)
  const isJoiningRef = useRef(false)
  const localAudioTrackRef = useRef(null)
  const localVideoTrackRef = useRef(null)
  const hasCalledEndRef = useRef(false)
  const mountedRef = useRef(true)
  const joinAttemptedRef = useRef(false)
  const ringtoneRef = useRef(null)

  const APP_ID = import.meta.env.VITE_AGORA_APP_ID
  const TOKEN_URL = import.meta.env.VITE_SUPABASE_FUNCTION_URL

  useEffect(() => {
    if (!clientRef.current) {
      clientRef.current = AgoraRTC.createClient({ mode: "rtc", codec: "h264", areaCode: ["IN"] })

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
        setRemoteUsers(prev => {
          const updated = {...prev }
          delete updated[user.uid]
          if(Object.keys(updated).length === 0) safeEndCall()
          return updated
        })
      }
      clientRef.current.on("user-unpublished", handleUserLeft)
      clientRef.current.on("user-left", handleUserLeft)
    }
  }, [])

  useEffect(() => {
    if (incomingCall && isRinging) {
      ringtoneRef.current = new Audio('/ringtone.mp3')
      ringtoneRef.current.loop = true
      ringtoneRef.current.play().catch(e => console.log("Autoplay blocked:", e))
    }
    return () => { ringtoneRef.current?.pause() }
  }, [incomingCall, isRinging])

  useEffect(() => {
    mountedRef.current = true
    if (incomingCall) return
    if (joinAttemptedRef.current) return
    if (!channelName ||!APP_ID) { setError("Missing channelName"); setTimeout(() => safeEndCall(), 1500); return }
    joinAttemptedRef.current = true
    joinChannel()
    return () => { mountedRef.current = false }
  }, [channelName, incomingCall])

  const handleAcceptCall = async () => {
    setIsRinging(false)
    ringtoneRef.current?.pause()
    onAcceptCall?.()
    await joinChannel()
  }

  const handleRejectCall = () => {
    setIsRinging(false)
    ringtoneRef.current?.pause()
    onRejectCall?.()
    safeEndCall()
  }

  useEffect(() => {
    Object.values(remoteUsers).forEach(user => {
      if (user.videoTrack) {
        const element = document.getElementById(`remote-video-${user.uid}`)
        if (element) user.videoTrack.play(element, {fit: "cover"}) // 👈 FIX 2: iOS ke liye
      }
    })
  }, [remoteUsers])

  const joinChannel = async () => {
    if (isJoiningRef.current ||!clientRef.current ||!mountedRef.current) return
    isJoiningRef.current = true
    const finalChannelName = (incomingCall?.channel_name || channelName).trim().substring(0, 64)
    try {
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks({
        encoderConfig: { width: 640, height: 480, frameRate: 15 }
      })
      if (!mountedRef.current) { audioTrack.close(); videoTrack.close(); return }
      localAudioTrackRef.current = audioTrack
      localVideoTrackRef.current = videoTrack
      if (localVideoRef.current) videoTrack.play(localVideoRef.current)
      const uid = Number(userId) || Math.floor(Math.random() * 100000)
      const res = await fetch(TOKEN_URL, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelName: finalChannelName, uid: uid })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Token fetch failed")
      await clientRef.current.join(APP_ID, finalChannelName, data.token, uid)
      await clientRef.current.enableDualStream()
      await clientRef.current.publish([audioTrack, videoTrack])
      if (mountedRef.current) { setJoined(true); setError(null) }
    } catch (error) {
      console.error("Error joining:", error)
      if (mountedRef.current) { setError(error.message); setTimeout(() => safeEndCall(), 1500) }
    } finally { isJoiningRef.current = false }
  }

  const cleanup = async () => {
    isJoiningRef.current = false
    localAudioTrackRef.current?.stop(); localAudioTrackRef.current?.close()
    localVideoTrackRef.current?.stop(); localVideoTrackRef.current?.close()
    localAudioTrackRef.current = null; localVideoTrackRef.current = null
    if (clientRef.current) { clientRef.current.removeAllListeners(); await clientRef.current.leave() }
    setJoined(false); setRemoteUsers({})
  }

  const safeEndCall = () => {
    if (hasCalledEndRef.current) return
    hasCalledEndRef.current = true
    onCallEnd?.()
    cleanup()
  }

  if (isRinging && incomingCall) {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-gray-900 to-black flex items-center justify-center" style={{zIndex: 9999}}>
        <div className="text-center">
          <img src={incomingCall.from_photo || '/default-avatar.png'} className="w-32 h-32 rounded-full mx-auto mb-6 border-4 border-white animate-pulse" />
          <h2 className="text-white text-3xl font-bold mb-2">{incomingCall.from_name}</h2>
          <p className="text-gray-300 text-xl mb-12">Video calling...</p>
          <div className="flex gap-8 justify-center">
            <button onClick={handleRejectCall} className="bg-red-600 w-20 h-20 rounded-full">Reject</button>
            <button onClick={handleAcceptCall} className="bg-green-600 w-20 h-20 rounded-full animate-bounce">Accept</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black flex-col" style={{zIndex: 9999, width: '100vw', height: '100vh'}}>
      <div className="flex-1 relative">
        {error? (
          <div className="text-red-500 text-xl bg-black/80 p-4 rounded absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">Error: {error}</div>
        ) : Object.keys(remoteUsers).length > 0? (
          <div className="w-full h-full flex-wrap justify-center items-center gap-2"> {/* 👈 FIX 1: flex add kiya */}
            {Object.values(remoteUsers).map(user => (
             <div key={user.uid} id={`remote-video-${user.uid}`} className="flex-1 min-w-[300px] h-full bg-gray-900" />
            ))}
          </div>
        ) : (
          <div className="text-white text-lg absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">{joined? "Waiting for other user to join..." : "Connecting..."}</div>
        )}
        <div ref={localVideoRef} className="absolute bottom-24 right-4 w-32 h-48 bg-gray-800 rounded-lg overflow-hidden border-2 border-white" style={{ zIndex: 100 }} />
      </div>
      <div className="bg-gray-900 p-4 flex justify-center gap-4" style={{zIndex: 1000}}>
        <button onClick={safeEndCall} className="bg-red-600 text-white px-8 py-4 rounded-full font-bold text-lg">END CALL</button>
      </div>
    </div>
  )
}
export default VideoCallOverlay
