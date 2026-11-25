// 행사용 음원(저작권 곡)은 링크에 올리지 않고, 행사 노트북 브라우저(IndexedDB)에만 저장합니다.
//   Entrance  = 04 스칼렛 입장곡 (1:26 부터)
//   CountSong = 02 카운트다운 곡 (처음부터, 카운트다운 시계와 맞춰 재생)
(function(){
  'use strict';
  const DB='yearend-show',STORE='files';
  function idb(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
  async function save(key,file){const db=await idb();return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(file,key);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
  async function load(key){const db=await idb();return new Promise(res=>{const r=db.transaction(STORE).objectStore(STORE).get(key);r.onsuccess=()=>res(r.result||null);r.onerror=()=>res(null)})}

  function slot(key,START,event){
    const audio=new Audio();audio.preload='auto';
    let url=null,name='',fadeT=null;
    function use(file){if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(file);audio.src=url;name=file.name||key}
    const ready=load(key).then(f=>{if(f)use(f)}).catch(()=>{}).then(()=>window.dispatchEvent(new Event(event)));
    return {
      START,ready,
      get name(){return url?name:''},
      get state(){return {time:+audio.currentTime.toFixed(2),paused:audio.paused,volume:audio.volume}},
      async pick(file){use(file);try{await save(key,file)}catch(e){}},
      play(offset=0,fadeIn=.5){ // START + offset 초 지점부터, fadeIn 초 동안 소리를 키우며 재생 (뚝 끊기지 않게)
        if(!url)return false;
        clearInterval(fadeT);audio.volume=fadeIn>0?0:1;
        if(fadeIn>0){const step=1/(fadeIn*20);fadeT=setInterval(()=>{audio.volume=Math.min(1,audio.volume+step);if(audio.volume>=1)clearInterval(fadeT)},50)}
        const go=()=>{try{audio.currentTime=START+offset}catch(e){}audio.play().catch(()=>{})};
        audio.readyState>=1?go():audio.addEventListener('loadedmetadata',go,{once:true});
        return true;
      },
      stop(fade=1.2){ // 장면을 떠날 때 부드럽게 줄이며 멈춤
        clearInterval(fadeT);if(audio.paused)return;
        const step=Math.max(.01,audio.volume/(fade*20));
        fadeT=setInterval(()=>{audio.volume=Math.max(0,audio.volume-step);if(audio.volume<=0){clearInterval(fadeT);audio.pause()}},50);
      },
      pause(){audio.pause()},
      get playing(){return !audio.paused},
      get el(){return audio},
      onEnded(fn){audio.addEventListener('ended',fn)},
      resume(){if(url&&audio.currentTime>0)audio.play().catch(()=>{})}
    };
  }
  // 03 오프닝 사진 묶음 — 크루 사진도 링크에 올리지 않고 노트북 브라우저에만 저장
  window.Photos=(function(){
    const KEY='opening-photos';let urls=[];
    function use(files){urls.forEach(u=>URL.revokeObjectURL(u));urls=(files||[]).map(f=>URL.createObjectURL(f))}
    const ready=load(KEY).then(use).catch(()=>{}).then(()=>window.dispatchEvent(new Event('photos-ready')));
    return {ready,get list(){return urls.slice()},
      async pick(fileList){const files=[...fileList].filter(f=>/^image\//.test(f.type));use(files);try{await save(KEY,files)}catch(e){}window.dispatchEvent(new Event('photos-ready'))},
      async clear(){use([]);try{await save(KEY,[])}catch(e){}window.dispatchEvent(new Event('photos-ready'))}};
  })();
  window.Entrance=slot('scarlett-song',86,'entrance-ready');
  // 05 데이빗 라디오 음성 (처음부터)
  window.RadioVoice=slot('radio-voice',0,'radio-ready');
  // 01 입장 대기 음악 2곡 — 번갈아 계속 재생
  window.WelcomeSongs=[slot('welcome-song-1',0,'welcome-ready'),slot('welcome-song-2',0,'welcome-ready')];
  window.CountSong=slot('countdown-song',0,'countsong-ready');
})();
