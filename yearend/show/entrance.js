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

  // ── 모바일·다른 PC에서도 소리 나게 ──
  // ① 브라우저는 사람이 한 번 누르기 전엔 소리를 막음 → 첫 터치/클릭/키 때 모든 음원을 '무음으로 한 번 재생→멈춤'해서 잠금 해제
  // ② 아이폰·아이패드는 audio.volume 이 안 먹음(항상 100%) → 페이드·잔잔한 볼륨이 안 되고, 멈춤 페이드가 끝나지 않아 곡이 안 꺼짐
  //    → 그 기기에서만 Web Audio 볼륨(게인)으로 연결하고, el.volume 을 그 게인으로 바꿔 끼움 (기존 코드 그대로 동작)
  const FIXED_VOL=(()=>{try{const a=document.createElement('audio');a.volume=.5;return a.volume!==.5}catch(e){return false}})();
  const mediaPlay=HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play=function(){if(this._prime){this._prime=false;this.muted=false}return mediaPlay.apply(this,arguments)};
  const ELS=new Set();let ctx=null,unlocked=false;
  function getCtx(){if(!ctx){try{ctx=new (window.AudioContext||window.webkitAudioContext)()}catch(e){ctx=null}}return ctx}
  function wrap(el){ // 아이폰용: 요소 → 게인 → 스피커, el.volume = 게인 값
    if(el._gain||!getCtx())return;
    try{const src=ctx.createMediaElementSource(el),g=ctx.createGain();let v=1;g.gain.value=1;src.connect(g);g.connect(ctx.destination);
      el._src=src;el._gain=g;
      Object.defineProperty(el,'volume',{configurable:true,get(){return v},set(x){v=Math.max(0,Math.min(1,+x||0));g.gain.value=v}});
    }catch(e){}
  }
  function prime(el){
    if(!el.paused||!(el.currentSrc||el.src))return;
    el._prime=true;el.muted=true;
    const p=mediaPlay.call(el);
    const done=()=>{if(el._prime){el._prime=false;el.pause();try{el.currentTime=0}catch(e){}el.muted=false}};
    p&&p.then?p.then(done,done):done();
  }
  function unlock(){
    const c=getCtx();if(c&&c.state!=='running')c.resume().catch(()=>{});
    if(unlocked)return;unlocked=true;
    try{if(navigator.audioSession)navigator.audioSession.type='playback'}catch(e){} // 아이폰 무음 스위치여도 재생
    document.querySelectorAll('audio').forEach(a=>ELS.add(a));
    if(FIXED_VOL)ELS.forEach(wrap);
    ELS.forEach(prime);
    document.documentElement.classList.add('snd-on');
    setTimeout(()=>window.dispatchEvent(new Event('sound-unlocked')),450);
  }
  ['pointerdown','touchend','keydown','click'].forEach(t=>addEventListener(t,unlock,{capture:true,passive:true}));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&ctx&&ctx.state!=='running'&&unlocked)ctx.resume().catch(()=>{})});
  window.ShowAudio={
    get unlocked(){return unlocked},fixedVolume:FIXED_VOL,
    ctx:getCtx,
    tap(el){ // 분석기(라디오 화면 파형)에 연결할 출력 노드. 이미 감싼 요소면 그 게인을 넘겨줌
      const c=getCtx();if(!c)return null;
      if(el._gain){try{el._gain.disconnect()}catch(e){}return el._gain}
      if(!el._src){try{el._src=c.createMediaElementSource(el)}catch(e){return null}}
      return el._src;
    }
  };

  const DEF={'countdown-song':'audio/countdown.mp3','scarlett-song':['audio/scarlett-86.mp3',86],'welcome-song-1':'audio/welcome1.mp3',
    'radio-voice':'audio/david-voice.m4a','radio-bed':['audio/david-bed-18.mp3',18],'julian-song':'audio/julian.mp3','closing-song':'audio/closing.mp3'};
  // [주소, 잘라 둔 초] = 그 지점부터 미리 잘라 둔 파일 (아이패드·아이폰 사파리는 곡 중간으로 멀리 건너뛰기를 자주 실패 → 건너뛸 필요 없게)
  function slot(key,START,event){
    const audio=new Audio();audio.preload='auto';ELS.add(audio);
    let url=null,name='',fadeT=null,base=START; // base = 이 파일에서 실제로 건너뛸 지점
    function use(file){if(url&&url.startsWith('blob:'))URL.revokeObjectURL(url);url=URL.createObjectURL(file);audio.src=url;name=file.name||key;base=START}
    function useDef(){if(url||!DEF[key])return;const d=[].concat(DEF[key]);url=d[0];base=START-(d[1]||0);audio.src=url;name='기본 음원'}
    const ready=load(key).then(f=>{if(f)use(f)}).catch(()=>{}).then(()=>{useDef();window.dispatchEvent(new Event(event))});
    return {
      START,ready,get base(){return base},
      get name(){return url?name:''},
      get state(){return {time:+audio.currentTime.toFixed(2),paused:audio.paused,volume:audio.volume}},
      async pick(file){use(file);try{await save(key,file)}catch(e){}},
      play(offset=0,fadeIn=.5){ // START + offset 초 지점부터, fadeIn 초 동안 소리를 키우며 재생 (뚝 끊기지 않게)
        if(!url)return false;
        clearInterval(fadeT);audio.volume=fadeIn>0?0:1;
        if(fadeIn>0){const step=1/(fadeIn*20);fadeT=setInterval(()=>{audio.volume=Math.min(1,audio.volume+step);if(audio.volume>=1)clearInterval(fadeT)},50)}
        const at=Math.max(0,base+offset);
        const go=()=>{try{audio.currentTime=at}catch(e){}audio.play().catch(()=>{});
          // 사파리가 건너뛰기를 무시하면 재생이 시작된 뒤 한 번 더 맞춤
          if(at>1)audio.addEventListener('playing',()=>{if(Math.abs(audio.currentTime-at)>1.5)try{audio.currentTime=at}catch(e){}},{once:true})};
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
  RadioBed.el.addEventListener('ended',()=>{RadioBed.el.currentTime=RadioBed.base;RadioBed.el.play().catch(()=>{})}); // 끝나면 다시 18초부터
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
