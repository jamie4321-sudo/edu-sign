// 행사용 음원(저작권 곡)은 링크에 올리지 않고, 행사 노트북 브라우저(IndexedDB)에만 저장합니다.
//   Entrance  = 04 스칼렛 입장곡 (1:26 부터)
//   CountSong = 02 카운트다운 곡 (처음부터, 카운트다운 시계와 맞춰 재생)
// 11-26 Jamie 결정: 누가 링크를 열어도 소리가 나도록 기본 음원을 audio/ 폴더에 공개(노트북에서 고른 파일이 있으면 그 파일 우선).
(function(){
  'use strict';
  const DB='yearend-show',STORE='files';
  function idb(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
  async function save(key,file){const db=await idb();return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(file,key);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
  async function load(key){const db=await idb();return new Promise(res=>{const r=db.transaction(STORE).objectStore(STORE).get(key);r.onsuccess=()=>res(r.result||null);r.onerror=()=>res(null)})}

  const DEF={'countdown-song':'audio/countdown.mp3','scarlett-song':'audio/scarlett.mp3','welcome-song-1':'audio/welcome1.mp3',
    'radio-voice':'audio/david-voice.m4a','radio-bed':'audio/david-bed.mp3','julian-song':'audio/julian.mp3','closing-song':'audio/closing.mp3'};
  function slot(key,START,event){
    const audio=new Audio();audio.preload='auto';
    let url=null,name='',fadeT=null;
    function use(file){if(url&&url.startsWith('blob:'))URL.revokeObjectURL(url);url=URL.createObjectURL(file);audio.src=url;name=file.name||key}
    function useDef(){if(url||!DEF[key])return;url=DEF[key];audio.src=url;name='기본 음원'}
    const ready=load(key).then(f=>{if(f)use(f)}).catch(()=>{}).then(()=>{useDef();window.dispatchEvent(new Event(event))});
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
  // 05 데이빗 음성이 끝나면 이어서 깔리는 배경음 (반복)
  window.RadioBed=slot('radio-bed',18,'radiobed-ready'); // 18초부터 (JunTankrillex 믹스)
  RadioBed.el.addEventListener('ended',()=>{RadioBed.el.currentTime=18;RadioBed.el.play().catch(()=>{})}); // 끝나면 다시 18초부터
  // 01 입장 대기 음악 2곡 — 번갈아 계속 재생
  window.WelcomeSongs=[slot('welcome-song-1',0,'welcome-ready'),slot('welcome-song-2',0,'welcome-ready')];
  window.CountSong=slot('countdown-song',0,'countsong-ready');
  // 07 줄리앙 입장곡 (처음부터)
  window.JulianSong=slot('julian-song',0,'julian-ready');
  // 07B 베스트 드레서 투표 배경음 (반복) · 투표 QR 이미지
  window.VoteSong=slot('vote-song',0,'votesong-ready');VoteSong.el.loop=true;
  // 11 마무리 곡
  window.ClosingSong=slot('closing-song',0,'closing-ready');
  // 09 마무리 인사(제이미) 크레딧 곡
  window.CreditSong=slot('credit-song',0,'credit-ready');
  window.VoteQR=(function(){const KEY='vote-qr';let url='';
    function use(f){if(url)URL.revokeObjectURL(url);url=f?URL.createObjectURL(f):''}
    const ready=load(KEY).then(use).catch(()=>{}).then(()=>window.dispatchEvent(new Event('voteqr-ready')));
    return {ready,get url(){return url},
      async pick(f){use(f);try{await save(KEY,f)}catch(e){}window.dispatchEvent(new Event('voteqr-ready'))},
      async clear(){use(null);try{await save(KEY,null)}catch(e){}window.dispatchEvent(new Event('voteqr-ready'))}};
  })();
})();
