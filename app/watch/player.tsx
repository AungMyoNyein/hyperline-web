'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import type HlsType from 'hls.js';
import {api,ApiError,errorText} from '../../lib/api';
import {useSession} from '../session';
type Playback={url:string;session_id:string;expires_at:string;source:{kind:string}|null;credentials_required?:boolean;renew_after_seconds?:number|null};
export default function Player({id}:{id:string}){
  const videoRef=useRef<HTMLVideoElement>(null);const containerRef=useRef<HTMLDivElement>(null);const hlsRef=useRef<HlsType|null>(null);
  const {token,expire}=useSession();const [loading,setLoading]=useState(false);const [error,setError]=useState('');const [retry,setRetry]=useState(0);const [levels,setLevels]=useState<{height:number;bitrate:number}[]>([]);const [quality,setQuality]=useState(-1);
  useEffect(()=>{if(!token||!/^\d+$/.test(id))return;const video=videoRef.current;if(!video)return;const controller=new AbortController();let disposed=false;let hls:HlsType|null=null;let renewal:number|undefined;let restorePosition:(()=>void)|undefined;setLoading(true);setError('');setLevels([]);setQuality(-1);
    const timeout=window.setTimeout(()=>{if(!disposed){setLoading(false);setError('The stream took too long to load. Please retry.');hls?.destroy();window.clearTimeout(renewal);controller.abort();}},30000);
    function ready(){window.clearTimeout(timeout);setLoading(false);}
    function mediaError(){ready();setError('The video could not be loaded. Check stream access, CDN CORS settings, format, and connection.');}
    video.addEventListener('loadeddata',ready);video.addEventListener('error',mediaError);
    (async()=>{try{
      const j=await api<{data:Playback}>('/playback/sessions',token,{method:'POST',credentials:'include',body:JSON.stringify({movie_id:Number(id)}),signal:controller.signal});if(disposed)return;
      const playback=j.data;const url=new URL(playback.url);if(url.protocol!=='https:'&&!(process.env.NODE_ENV!=='production'&&url.hostname==='127.0.0.1'))throw new Error('The playback URL is not secure.');
      video.crossOrigin=playback.credentials_required?'use-credentials':'anonymous';
      async function renew(session:Playback){
        if(disposed||!session.renew_after_seconds)return;
        renewal=window.setTimeout(async()=>{try{const result=await api<{data:Playback}>(`/playback/sessions/${encodeURIComponent(session.session_id)}/renew`,token,{method:'POST',credentials:'include',signal:controller.signal});if(!disposed){
            const next=result.data;
            if(next.url!==session.url){
              const updated=new URL(next.url);if(updated.protocol!=='https:')throw new Error('The renewed playback URL is not secure.');
              const position=video?.currentTime||0;const playing=video?!video.paused:false;
              if(restorePosition)video?.removeEventListener('loadedmetadata',restorePosition);
              restorePosition=()=>{if(video&&Number.isFinite(position))video.currentTime=position;if(playing)void video?.play().catch(()=>{});};
              video?.addEventListener('loadedmetadata',restorePosition,{once:true});
              if(hls)hls.loadSource(updated.href);else if(video){video.src=updated.href;video.load();}
            }
            renew(next);
          }}catch(e){if(!disposed&&!controller.signal.aborted){video?.pause();hls?.stopLoad();setError('Playback authorization could not be renewed. '+errorText(e));if(e instanceof ApiError&&e.status===401)expire();}}},session.renew_after_seconds*1000);
      }
      renew(playback);
      if(playback.source?.kind==='mp4'){video.src=url.href;video.load();return;}
      if(playback.source?.kind!=='hls')throw new Error('This source format is not supported by this player. Please choose an HLS source.');
      const Hls=(await import('hls.js')).default;if(disposed)return;if(!Hls.isSupported()){if(video.canPlayType('application/vnd.apple.mpegurl')){video.src=url.href;video.load();return;}throw new Error('HLS playback is not supported by this browser.');}
      hls=new Hls({enableWorker:true,xhrSetup:(xhr)=>{xhr.withCredentials=!!playback.credentials_required;},fetchSetup:(context,init)=>new Request(context.url,{...init,credentials:playback.credentials_required?'include':'omit'})});hlsRef.current=hls;
      hls.on(Hls.Events.MANIFEST_PARSED,()=>{if(!disposed)setLevels(hls!.levels.map(l=>({height:l.height,bitrate:l.bitrate})));});
      let recovered=false;
      hls.on(Hls.Events.ERROR,(_event,data)=>{if(disposed||!data.fatal)return;if(data.type===Hls.ErrorTypes.MEDIA_ERROR&&!recovered){recovered=true;hls?.recoverMediaError();return;}ready();window.clearTimeout(renewal);setError(data.type===Hls.ErrorTypes.NETWORK_ERROR?'Unable to load this stream. The CDN may be unavailable, the URL may have expired, or browser CORS access may be blocked.':`Playback failed (${data.details}). Please retry.`);hls?.destroy();hlsRef.current=null;});
      hls.loadSource(url.href);hls.attachMedia(video);
    }catch(e){if(!disposed&&!controller.signal.aborted){ready();setError(errorText(e));if(e instanceof ApiError&&e.status===401)expire();}}})();
    return()=>{disposed=true;controller.abort();window.clearTimeout(renewal);window.clearTimeout(timeout);hls?.destroy();hlsRef.current=null;if(restorePosition)video.removeEventListener('loadedmetadata',restorePosition);video.removeEventListener('loadeddata',ready);video.removeEventListener('error',mediaError);video.pause();video.removeAttribute('src');video.load();};
  },[id,token,retry,expire]);
  async function fullscreen(){try{const video=videoRef.current as (HTMLVideoElement&{webkitEnterFullscreen?:()=>void})|null;if(containerRef.current?.requestFullscreen)await containerRef.current.requestFullscreen();else if(video?.webkitEnterFullscreen)video.webkitEnterFullscreen();else setError('Use the video controls to enter full screen.');}catch{setError('Full screen is unavailable. Use the video controls.');}}
  if(!id||!/^\d+$/.test(id))return <p>Select a movie from the <Link href="/movies">catalog</Link>.</p>;
  if(!token)return <p><Link className="button" href={`/login?next=${encodeURIComponent(`/watch?id=${id}`)}`}>Sign in to watch</Link></p>;
  return <><div className="player" ref={containerRef}><video ref={videoRef} controls playsInline preload="metadata" crossOrigin="anonymous" aria-label="Movie player"/>{loading&&<p className="player-status" role="status">Loading stream…</p>}</div><div className="player-tools"><button onClick={fullscreen}>Full screen</button>{levels.length>0&&<label>Quality<select aria-label="Quality" value={quality} onChange={e=>{const level=Number(e.target.value);setQuality(level);if(hlsRef.current)hlsRef.current.currentLevel=level;}}><option value={-1}>Auto (adaptive)</option>{levels.map((l,i)=><option key={i} value={i}>{l.height?`${l.height}p`:`${Math.round(l.bitrate/1000)} kbps`}</option>)}</select></label>}<button className="secondary" onClick={()=>setRetry(r=>r+1)}>Reload stream</button></div>{error&&<p className="error" role="alert">{error}</p>}</>;
}
