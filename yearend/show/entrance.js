// 스칼렛 입장곡 — 음원은 링크에 올리지 않고, 행사 노트북 브라우저(IndexedDB)에만 저장합니다.
(function(){
  'use strict';
  const DB='yearend-show',STORE='files',KEY='scarlett-song';
  const START=86; // 1:26 부터 재생
  const audio=new Audio();audio.preload='auto';
  let url=null,name='',fadeT=null;
  function idb(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
  async function save(file){const db=await idb();return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(file,KEY);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
  async function load(){const db=await idb();return new Promise(res=>{const r=db.transaction(STORE).objectStore(STORE).get(KEY);r.onsuccess=()=>res(r.result||null);r.onerror=()=>res(null)})}
  function use(file){if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(file);audio.src=url;name=file.name||'입장곡'}
  const ready=load().then(f=>{if(f)use(f)}).catch(()=>{}).then(()=>window.dispatchEvent(new Event('entrance-ready')));
  window.Entrance={
    START,ready,
    get name(){return url?name:''},
    get state(){return {time:+audio.currentTime.toFixed(2),paused:audio.paused,volume:audio.volume}},
    async pick(file){use(file);try{await save(file)}catch(e){}},
    play(){
      if(!url)return false;
      clearInterval(fadeT);audio.volume=1;
      const go=()=>{try{audio.currentTime=START}catch(e){}audio.play().catch(()=>{})};
      audio.readyState>=1?go():audio.addEventListener('loadedmetadata',go,{once:true});
      return true;
    },
    stop(fade=1.2){ // 장면을 떠날 때 부드럽게 줄이며 멈춤
      clearInterval(fadeT);if(audio.paused)return;
      const step=Math.max(.01,audio.volume/(fade*20));
      fadeT=setInterval(()=>{audio.volume=Math.max(0,audio.volume-step);if(audio.volume<=0){clearInterval(fadeT);audio.pause()}},50);
    },
    pause(){audio.pause()},
    resume(){if(url&&audio.currentTime>0)audio.play().catch(()=>{})}
  };
})();
