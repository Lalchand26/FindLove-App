import { useEffect, useRef, useState } from "react"
import AgoraRTC from "agora-rtc-sdk-ng"
import { supabase } from "../../lib/supabase" // 👈 supabase import add karo

export default function VideoCallOverlay({
  channelName,
  userId,
  onCallEnd,
  incomingCall = null,
  onAcceptCall,
  onRejectCall,
  userName
}) {
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState(null)
  const [isRinging, setIsRinging] = useState(!!incomingCall)

  const clientRef = useRef(null)
  const isJoiningRef = useRef(false)
  const localAudioTrackRef = useRef(null)
  const hasCalledEndRef = useRef(false)
  const mountedRef = useRef(true)
  const joinAttemptedRef = useRef(false)
  const ringtoneRef = useRef(null)

  const APP_ID = import.meta.env.VITE_AGORA_APP_ID

  useEffect(() => {
    mountedRef.current = true;
    if (!clientRef.current) {
      clientRef.current = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" })

      clientRef.current.on("user-published", async (user, mediaType) => {
        await clientRef.current.subscribe(user, mediaType)
        if (mediaType === "audio") {
          user.audioTrack?.play() // 👈 Sirf audio play karo
        }
      })

      clientRef.current.on("user-left", () => {
        safeEndCall() // dusra cut kare to call end
      })
    }
    return () => {
      mountedRef.current = false
      cleanup()
    }
  }, [])

  // Ringtone for incoming
  useEffect(() => {
    if (incomingCall && isRinging) {
      ringtoneRef.current = new Audio('/ringtone.mp3')
      ringtoneRef.current.loop = true
      ringtoneRef.current.play().catch(e => console.log("Autoplay blocked:", e))
    }
    return () => {
      ringtoneRef.current?.pause()
      if (ringtoneRef.current) ringtoneRef.current = null
    }
  }, [incomingCall, isRinging])

  // Auto join for outgoing
  useEffect(() => {
    if (incomingCall) {
      joinAttemptedRef.current = false
      return
    }
    if (joinAttemptedRef.current) return
    if (!channelName ||!APP_ID) {
      setError("Missing channelName or APP_ID")
      setTimeout(() => safeEndCall(), 1500)
      return
    }
    joinAttemptedRef.current = true
    joinChannel()
  }, [channelName, incomingCall, APP_ID])

  const handleAcceptCall = () => {
    setIsRinging(false)
    ringtoneRef.current?.pause()
    onAcceptCall?.()
    joinAttemptedRef.current = true
    setTimeout(() => joinChannel(), 100)
  }

  const handleRejectCall = () => {
    setIsRinging(false)
    ringtoneRef.current?.pause()
    onRejectCall?.()
    safeEndCall()
  }

  const joinChannel = async () => {
    if (isJoiningRef.current ||!clientRef.current ||!mountedRef.current) return
    isJoiningRef.current = true
    const finalChannelName = (incomingCall?.channel_name || channelName)?.trim().substring(0, 64)

    try {
      // 1. MIC PERMISSION
      await navigator.mediaDevices.getUserMedia({ audio: true, video: false })

      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack()
      if (!mountedRef.current) {
        audioTrack.close()
        return
      }
      localAudioTrackRef.current = audioTrack

      // 2. UUID to number - Agora ko number chahiye
      const uid = Math.abs(userId.split('-').join('').hashCode()) % 100000

      // 👇 3. TOKEN SUPABASE SE LAO - YE BADLA HAI
      const { data, error: tokenError } = await supabase.functions.invoke('agora-token', {
        body: { channelName: finalChannelName, uid }
      })

      if (tokenError) throw tokenError
      if (!data?.token) throw new Error("Token missing in response")

      // 4. JOIN + PUBLISH
      await clientRef.current.join(APP_ID, finalChannelName, data.token, uid)
      await clientRef.current.publish([audioTrack]) // 👈 Sirf audio publish

      if (mountedRef.current) setJoined(true)
    } catch (error) {
      console.error("Join error:", error)
      setError(error.name === 'NotAllowedError'? "Mic Permission Denied" : error.message)
      setTimeout(() => safeEndCall(), 3000)
    } finally {
      isJoiningRef.current = false
    }
  }

  // String ko number me convert karne ke liye
  String.prototype.hashCode = function() {
    var hash = 0, i, chr;
    if (this.length === 0) return hash;
    for (i = 0; i < this.length; i++) {
      chr = this.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return hash;
  };

  const cleanup = async () => {
    localAudioTrackRef.current?.stop(); localAudioTrackRef.current?.close()
    localAudioTrackRef.current = null
    if (clientRef.current) {
      clientRef.current.removeAllListeners()
      try { await clientRef.current.leave() } catch(e) { console.log(e) }
    }
    setJoined(false); joinAttemptedRef.current = false
  }

  const safeEndCall = () => {
    if (hasCalledEndRef.current) return
    hasCalledEndRef.current = true
    onCallEnd?.()
    cleanup()
  }

  // INCOMING CALL SCREEN
  if (isRinging && incomingCall) {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-purple-900 to-black flex items-center justify-center" style={{zIndex: 9999}}>
        <div className="text-center">
          <div className="text-8xl mb-6">📞</div>
          <h2 className="text-white text-3xl font-bold mb-2">{incomingCall.from_name || userName}</h2>
          <p className="text-gray-300 text-xl mb-12">Incoming Voice Call...</p>
          <div className="flex gap-8 justify-center">
            <button onClick={handleRejectCall} className="bg-red-600 hover:bg-red-700 w-20 h-20 rounded-full text-white font-bold text-lg">Reject</button>
            <button onClick={handleAcceptCall} className="bg-green-600 hover:bg-green-700 w-20 h-20 rounded-full text-white font-bold text-lg animate-bounce">Accept</button>
          </div>
        </div>
      </div>
    )
  }

  // OUTGOING / ON CALL SCREEN
  return (
    <div className="fixed inset-0 bg-gradient-to-b from-purple-900 to-black flex-col items-center justify-center" style={{zIndex: 9999}}>
      <div className="text-center">
        <div className="text-8xl mb-6">📞</div>
        <h2 className="text-white text-3xl font-bold mb-2">
          {joined? 'On Call' : 'Calling...'}
        </h2>
        <p className="text-gray-300 text-xl mb-12">{userName}</p>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <button onClick={safeEndCall} className="bg-red-600 hover:bg-red-700 text-white px-10 py-4 rounded-full font-bold text-lg">
          END CALL
        </button>
      </div>
    </div>
  )
}