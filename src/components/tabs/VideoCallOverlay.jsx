import { useEffect, useRef, useState } from "react"
import AgoraRTC from "agora-rtc-sdk-ng"

const VideoCallOverlay = ({ channelName, userId, onCallEnd }) => {
  const [joined, setJoined] = useState(false)
  const [remoteUsers, setRemoteUsers] = useState({})
  const [error, setError] = useState(null)

  const clientRef = useRef(null)
  const localVideoRef = useRef(null)
  const isJoiningRef = useRef(false)
  const localAudioTrackRef = useRef(null)
  const localVideoTrackRef = useRef(null)
  const hasCalledEndRef = useRef(false)
  const mountedRef = useRef(true)
  const joinAttemptedRef = useRef(false) // 👈 StrictMode double run prevent

  const APP_ID = import.meta.env.VITE_AGORA_APP_ID
  const TOKEN_URL = "http://localhost:8080/agora_token"

  // Client ek baar hi banao
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
      }

      clientRef.current.on("user-unpublished", handleUserLeft)
      clientRef.current.on("user-left", handleUserLeft)
    }

    return () => {
      // 👇 StrictMode cleanup - ignore first unmount
      if (process.env.NODE_ENV === 'development' &&!joinAttemptedRef.current) {
        console.log("StrictMode first unmount - ignoring")
        return
      }
    }
  }, [])

  // 👇 FIX: Sirf ek baar join karo, StrictMode safe
  useEffect(() => {
    mountedRef.current = true

    // StrictMode second mount pe hi join karo
    if (joinAttemptedRef.current) {
      console.log("StrictMode detected - already attempted, skipping")
      return
    }

    console.log("Overlay mounted. Channel:", channelName, "User:", userId)

    if (!channelName ||!APP_ID) {
      setError("Missing channelName or APP_ID")
      setTimeout(() => safeEndCall(), 1500)
      return
    }

    if (clientRef.current) {
      joinAttemptedRef.current = true // 👈 Mark attempted
      joinChannel()
    }

    return () => {
      mountedRef.current = false
      // 👇 Sirf real unmount pe cleanup, StrictMode pe nahi
      if (joinAttemptedRef.current && hasCalledEndRef.current) {
        console.log("Real unmount - cleaning up")
        cleanup()
      } else {
        console.log("StrictMode unmount - skipping cleanup")
      }
    }
  }, [])

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
    const finalChannelName = channelName.trim().substring(0, 64)

    try {
      console.log("1. Creating tracks...")
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks()

      if (!mountedRef.current) {
        console.log("Unmounted during track creation - aborting")
        audioTrack.close()
        videoTrack.close()
        return
      }

      localAudioTrackRef.current = audioTrack
      localVideoTrackRef.current = videoTrack
      console.log("2. Tracks created")

      if (localVideoRef.current) {
        videoTrack.play(localVideoRef.current)
      }

      console.log("3. Fetching token...")
      const uid = Number(userId) || Math.floor(Math.random() * 100000)

      const res = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelName: finalChannelName, uid: uid })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Token fetch failed")
      console.log("4. Token received")

      if (!mountedRef.current) {
        console.log("Unmounted during token fetch - aborting")
        return
      }

      console.log("5. Joining channel:", finalChannelName)
      await clientRef.current.join(APP_ID, finalChannelName, data.token, uid)
      console.log("6. Joined successfully")

      if (!mountedRef.current) {
        console.log("Unmounted after join - leaving")
        await clientRef.current.leave()
        return
      }

      console.log("7. Publishing tracks...")
      await clientRef.current.publish([audioTrack, videoTrack])
      console.log("8. Published successfully")

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
      console.log("Cleaning up...")
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
        console.log("Left channel successfully")
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

    console.log(">>> END CALL CLICKED - CLOSING NOW <<<")
    onCallEnd?.()
    cleanup()
  }

  return (
    <div
      className="fixed inset-0 bg-black flex flex-col"
      style={{
        zIndex: 9999999,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'auto'
      }}
    >
      <div
        className="absolute inset-0"
        onClick={safeEndCall}
        style={{ zIndex: 1, pointerEvents: 'auto' }}
      />

      <div className="flex-1 relative" style={{ pointerEvents: 'none', zIndex: 2 }}>
        <div className="w-full h-full flex flex-wrap justify-center items-center gap-2" style={{ pointerEvents: 'none' }}>
          {error? (
            <div className="text-red-500 text-xl bg-black/80 p-4 rounded" style={{ pointerEvents: 'none' }}>
              Error: {error}
            </div>
          ) : Object.keys(remoteUsers).length > 0? (
            Object.values(remoteUsers).map(user => (
              <div
                key={user.uid}
                id={`remote-video-${user.uid}`}
                className="flex-1 min-w-[300px] h-full bg-gray-900"
                style={{ pointerEvents: 'none' }}
              />
            ))
          ) : (
            <div className="text-white text-lg" style={{ pointerEvents: 'none' }}>
              {joined? "Waiting for other user to join..." : "Connecting..."}
            </div>
          )}
        </div>

        <div
          ref={localVideoRef}
          className="absolute bottom-24 right-4 w-32 h-48 bg-gray-800 rounded-lg overflow-hidden border-2 border-white"
          style={{ zIndex: 10000000, pointerEvents: 'none' }}
        />
      </div>

      <div
        className="bg-gray-900 p-4 flex justify-center gap-4"
        style={{
          zIndex: 10000001,
          position: 'relative',
          pointerEvents: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onMouseDown={safeEndCall}
          className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-8 py-4 rounded-full transition-all duration-200 shadow-lg font-bold cursor-pointer select-none text-lg"
          type="button"
          style={{
            pointerEvents: 'auto',
            position: 'relative',
            zIndex: 10000002,
            cursor: 'pointer',
            userSelect: 'none',
            minWidth: '120px'
          }}
        >
          END CALL
        </button>
      </div>
    </div>
  )
}

export default VideoCallOverlay