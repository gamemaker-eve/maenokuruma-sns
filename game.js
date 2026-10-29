/* ===== 前の車、10にします (game.js) ===== */
const NAME='前の車、10にします',TAG='#前の車10にします';
const SHARE_URL=location.origin+location.pathname;   // ★シェアに載せるURL(固定したいなら 'https://…' を直接書く)
// ★★ Supabase の設定(ランキング用)★★
//  Supabaseでプロジェクトを作ったら、下の2つに「Project URL」と「anon public key」を貼ってください(手順は GUIDE.md)。
//  空のままだと、ランキングは「この端末の中だけ」で動きます(テスト用)。
//  書き方の例: const SB_URL='https://abcdefgh.supabase.co',SB_KEY='eyJhbGciOi...(anon public key)';
const SB_URL='',SB_KEY='';   // ★SNS版用の新しいSupabaseプロジェクトの Project URL と publishable key をここに貼る
// ★ランキングの見せ方: true=身内用(全員の順位表が見える) / false=公開用(自分の順位だけ見える)
const FULL_RANKING=false;   // SNS版は公開用(自分の順位だけ表示)
// ★Xシェアボタン: 身内だけに共有したいとき(Xの投稿画面を出したくないとき)は、
//   下の「const SHOW_SHARE=true;」を「const SHOW_SHARE=false;」に書き換えるだけで、ゲーム終了画面の「Xでシェア」が消えます。
//   (ボタン本体は over() 関数の中の「Xでシェア」の行です。完全に消したいならその行の先頭に // を付けてコメントアウトしてください)
const SHOW_SHARE=true;
const MODES={
 easy:{n:'かんたん',t:30,ops:'+-',perm:0,rule:['数字はナンバーの順番のまま(固定)','数字の間に ＋ か − を入れて10にしよう','例: 1 ＋ 2 ＋ 3 ＋ 4 ＝ 10']},
 normal:{n:'ふつう',t:35,ops:'+-',perm:1,rule:['使えるのは ＋ と − だけ','数字は並べ替えが必要な問題!','数字ボタンを好きな順に押して式を作ろう']},
 hard:{n:'むずかしい',t:35,ops:'+-*/',perm:0,rule:['＋ − × ÷ が使える','数字の順番は固定','×÷は先に計算される(カッコなし)']},
 oni:{n:'鬼',t:40,ops:'+-*/',perm:1,rule:['数字の並べ替えが必要','＋ − × ÷ もすべて必要な問題','答えは10ではなく、表示される「目標」の数字']},
 hwy:{n:'タイムアタック',t:0,ops:'+-',perm:0,rule:['高速道路を走る距離は毎回同じ(60秒)','数字の順番は固定、＋ − だけ','前に入ってくる車を次々に解こう','何台・何点まで行けるか。ミスは−2秒']}};
const lab=k=>k=='hwy'?'高速:タイムアタック':'一般道路:'+MODES[k].n;
const NEXT={easy:'normal',normal:'hard',hard:'oni',oni:'oni',hwy:'hwy'},MULT={easy:1,normal:1.5,hard:2,oni:3,hwy:1};
const REG=['品川','練馬','横浜','名古屋','大阪','盛岡','札幌','福岡','なにわ','湘南'],KANA='あいうえかきくけこさすせ';
const COL=[0xc0392b,0x2c6fbb,0x2e8b57,0xdddddd,0x222831,0x8e44ad,0xe67e22,0x7f8c8d,0x1f4e79,0xb03a6a];
const $=id=>document.getElementById(id),N=()=>performance.now()/1000,rnd=(a,b)=>a+Math.random()*(b-a),two=()=>(''+(Math.random()*100|0)).padStart(2,'0'),ease=s=>s*s*(3-2*s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const setT=(id,t)=>{const e=$(id);if(e._t!==t){e._t=t;e.textContent=t}};
const fol=(g,vL)=>Math.sqrt(vL*vL+12*Math.max(0,g-2.4)),stopV=d=>Math.sqrt(12*Math.max(0,d));   // 前の車との間隔・止まる位置までの距離から、出していい最大の速さ(減速6m/s²)
const cv=$('c');let W=480,H=640,dpr=1,ren,camera;
let mode='normal',qm='normal',gold=0,lt=0,st='login',ph='idle',score=0,combo=0,life=3,wrong=0,solved=0,t0=0,enter=0,Te=6,T=30,q,ex=[],best={},log=[],
 spd=1,tg=null,slot=null,slotDist=0,dir=1,xt='straight',missT=0,okT=0,tm=N(),view='drive',bend=0,bendS=0,bendT=0,nextTurn=0,cw=null,lastCross=0,
 tod=rnd(5,19),wx='fine',night=0,hwEnd=0,npcs=[],onc=[],oncOn=0,oncT=0,nextOnc=0,exitS=null,hudS='',paused=0,pauseAt=0,clkS='',lastBlk=-1,rankLine='',
 user='',prev='home',rkMode='easy',leavers=[],plan=null,curS=0,fillT=0;
try{best=JSON.parse(localStorage.getItem('td_best2')||'{}');user=localStorage.getItem('td_user')||''}catch(e){}
const bst=m=>best[m]||{s:0,c:0};
function fit(){const s=$('stage');W=Math.max(200,s.clientWidth);H=Math.max(200,s.clientHeight);dpr=Math.min(2,devicePixelRatio||1);
 if(ren){ren.setPixelRatio(dpr);ren.setSize(W,H,false);camera.aspect=W/H;camera.updateProjectionMatrix()}}
addEventListener('resize',fit);if(window.ResizeObserver)new ResizeObserver(fit).observe($('stage'));

/* ---------- 計算(カッコなし・通常の計算順) ---------- */
function ev(s){let i=0;
 const E=()=>{let v=T_();while(s[i]=='+'||s[i]=='-'){const o=s[i++],r=T_();v=o=='+'?v+r:v-r}return v};
 const T_=()=>{let v=F();while(s[i]=='*'||s[i]=='/'){const o=s[i++],r=F();v=o=='*'?v*r:v/r}return v};
 const F=()=>{if(/\d/.test(s[i]))return +s[i++];throw 0};
 const v=E();if(i<s.length)throw 0;return v}
const PERM=(()=>{const r=[];(function f(a,b){if(!a.length)r.push(b);a.forEach((x,i)=>f(a.filter((_,j)=>j!=i),[...b,x]))})([0,1,2,3],[]);return r})();
function table(d,ops,perm){const t={};
 for(const p of perm?PERM:[PERM[0]])for(const a of ops)for(const b of ops)for(const c of ops){
  const s=d[p[0]]+a+d[p[1]]+b+d[p[2]]+c+d[p[3]];
  try{const v=ev(s);if(isFinite(v)&&Math.abs(v-Math.round(v))<1e-9)(t[Math.round(v)]=t[Math.round(v)]||[]).push(s)}catch(e){}}
 return t}
const pick=a=>a[Math.random()*a.length|0];
function make(m){const M=MODES[m];
 for(let i=0;i<800;i++){
  const d=[0,0,0,0].map(()=>Math.random()*10|0);
  if(m=='oni'){const A=table(d,'+-*/',1),B=table(d,'+-*/',0),C=table(d,'+-',1);
   const c=Object.keys(A).filter(k=>k>=1&&k<=99&&k!=10&&!B[k]&&!C[k]);   // 並べ替えと×÷が必要な数だけ
   if(c.length){const k=pick(c);return{d,target:+k,sol:pick(A[k])}}continue}
  const A=table(d,M.ops,M.perm)[10];if(!A)continue;
  if(M.perm&&table(d,M.ops,0)[10])continue;               // 並べ替えが必要な問題だけ
  if(M.ops.length>2&&table(d,'+-',M.perm)[10])continue;   // ×÷が必要な問題だけ
  return{d,target:10,sol:pick(A)}}
 return{d:[1,2,3,4],target:10,sol:'1+2+3+4'}}

/* ---------- サウンド ---------- */
let ac,nb;const A_=()=>ac=ac||new(window.AudioContext||window.webkitAudioContext)();
function beep(f,d=.1,ty='sine',v=.05,dl=0,f2){try{const c=A_(),o=c.createOscillator(),k=c.createGain(),s=c.currentTime+dl;o.type=ty;o.frequency.setValueAtTime(f,s);
 if(f2)o.frequency.exponentialRampToValueAtTime(f2,s+d);k.gain.setValueAtTime(v,s);k.gain.exponentialRampToValueAtTime(.0001,s+d);o.connect(k);k.connect(c.destination);o.start(s);o.stop(s+d+.02)}catch(e){}}
function noise(d,f0,f1,v,ty='bandpass'){try{const c=A_();if(!nb){nb=c.createBuffer(1,c.sampleRate,c.sampleRate);const a=nb.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1}
 const s=c.createBufferSource(),f=c.createBiquadFilter(),k=c.createGain(),t=c.currentTime;s.buffer=nb;s.loop=true;f.type=ty;f.frequency.setValueAtTime(f0,t);f.frequency.exponentialRampToValueAtTime(f1,t+d);
 k.gain.setValueAtTime(v,t);k.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(f);f.connect(k);k.connect(c.destination);s.start(t);s.stop(t+d+.05)}catch(e){}}
const engine=d=>{beep(70,d,'sawtooth',.05,0,260);beep(35,d,'square',.03,0,130);noise(d,300,1800,.04,'lowpass')};
const tick=on=>beep(on?1700:1150,.04,'square',.035),chime=(c=1)=>{const m=Math.pow(2,Math.min(Math.max(c,1)-1,18)/12);[523,659,784,1047].forEach((f,i)=>beep(f*m,.35,'triangle',.05,i*.07))},
 sparkle=()=>[1047,1319,1568,2093].forEach((f,i)=>beep(f,.4,'sine',.04,i*.09));
const vroom=()=>{beep(75,1.7,'sawtooth',.07,0,560);beep(38,1.7,'square',.04,0,280);noise(1.7,220,2600,.07,'lowpass')},bang=()=>{beep(110,.28,'square',.09,0,38);noise(.3,900,70,.14,'lowpass')};

/* ---------- 3Dシーン ---------- */
const scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(62,W/H,.1,240);
ren=new THREE.WebGLRenderer({canvas:cv,antialias:true});fit();scene.add(camera);
scene.fog=new THREE.Fog(0x9fd4ff,40,200);
const hemi=new THREE.HemisphereLight(0xbfd8ff,0x445533,1),sun=new THREE.DirectionalLight(0xfff2d0,.9);sun.position.set(30,50,20);scene.add(hemi,sun);
const GB=new THREE.BoxGeometry(1,1,1),GC=new THREE.CylinderGeometry(1,1,1,16),GS=new THREE.SphereGeometry(1,14,10),GP=new THREE.PlaneGeometry(1,1),GV=new THREE.PlaneGeometry(1,1),GCone=new THREE.ConeGeometry(1,1,8);GP.rotateX(-Math.PI/2);
const MC={};const mat=(c,e)=>MC[c+'|'+(e||0)]||(MC[c+'|'+(e||0)]=new THREE.MeshLambertMaterial({color:c,emissive:e||0}));
function bx(p,w,h,d,col,x,y,z,em){const m=new THREE.Mesh(GB,mat(col,em));m.scale.set(w,h,d);m.position.set(x,y,z);p.add(m);return m}
function cy(p,r,len,col,x,y,z,rz){const m=new THREE.Mesh(GC,mat(col));m.scale.set(r,len,r);m.position.set(x,y,z);if(rz)m.rotation.z=Math.PI/2;p.add(m);return m}
function pl(p,w,l,col,x,y,z){const m=new THREE.Mesh(GP,mat(col));m.scale.set(w,1,l);m.position.set(x,y,z);p.add(m);return m}
/* ---------- まとめ描き(街・森・駐車場の車・人の体は、頂点カラーで1つのメッシュにして軽くする) ---------- */
const GS6=new THREE.SphereGeometry(1,8,6),GC6=new THREE.CylinderGeometry(1,1,1,7),GPY=new THREE.ConeGeometry(1,1,4);GPY.rotateY(Math.PI/4);
const NG=new Map(),VCM=new THREE.MeshLambertMaterial({vertexColors:true}),_cc=new THREE.Color();
const ng=g=>{let r=NG.get(g);if(!r){r=g.index?g.toNonIndexed():g;NG.set(g,r)}return r};
const mx=(sx,sy,sz,x,y,z,rx,ry,rz)=>new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx||0,ry||0,rz||0)),new THREE.Vector3(sx,sy,sz));
const P_=(L,g,sx,sy,sz,x,y,z,col,rx,ry,rz)=>L.push([g,mx(sx,sy,sz,x,y,z,rx,ry,rz),col]);
function mergeG(L){const pos=[],nor=[],col=[],v=new THREE.Vector3(),nm=new THREE.Matrix3();
 for(const [g0,m,hex] of L){const g=ng(g0),pa=g.attributes.position,nr=g.attributes.normal;nm.getNormalMatrix(m);_cc.setHex(hex);
  for(let i=0;i<pa.count;i++){v.fromBufferAttribute(pa,i).applyMatrix4(m);pos.push(v.x,v.y,v.z);v.fromBufferAttribute(nr,i).applyMatrix3(nm).normalize();nor.push(v.x,v.y,v.z);col.push(_cc.r,_cc.g,_cc.b)}}
 const bg=new THREE.BufferGeometry();bg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));bg.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));bg.setAttribute('color',new THREE.Float32BufferAttribute(col,3));return bg}
const VM=L=>new THREE.Mesh(mergeG(L),VCM);
const WALL=[0xe8e0d0,0xd9d2c4,0xc9d3de,0xe6cfc0,0xcfd8c4,0xd8c8d8,0xf0ead8],ROOF=[0x7a3a2a,0x4a5a6a,0x3a4a3a,0x6a4a3a,0x2f3a4a,0x8a4a3a];
const FG=[0x1d5a2b,0x246b33,0x174c23,0x2f7a3a,0x3b8a3f,0x1a4a2a],CARC=[0xc0392b,0x2c6fbb,0xe8e8e8,0x222831,0x7f8c8d,0x2e8b57,0xe0b020,0x8e44ad];
function treeI(L,x,z,h){const t=Math.random()*FG.length|0;   // 針葉樹か広葉樹
 if(Math.random()<.5){P_(L,GC6,.2,h*.3,.2,x,h*.15,z,0x5a3a20);for(let j=0;j<4;j++){const r=h*.3*(1-j*.19),ch=h*.34;P_(L,GCone,r,ch,r,x,h*.22+j*h*.19+ch/2,z,FG[(t+j%2)%6])}}
 else{P_(L,GC6,.26,h*.5,.26,x,h*.25,z,0x5a3a20);for(let j=0;j<4;j++)P_(L,GS6,h*.26,h*.22,h*.26,x+rnd(-h*.12,h*.12),h*.62+rnd(0,h*.16),z+rnd(-h*.12,h*.12),FG[(t+j)%6])}}
const bushI=(L,x,z,w)=>P_(L,GS6,w,w*.7,w,x,w*.5,z,FG[Math.random()*6|0]);
function carI(L,x,z,aZ,col){const w=aZ?1.8:4.2,d=aZ?4.2:1.8,wc=aZ?1.55:2.4,dc=aZ?2.4:1.55;   // 止まっている車(aZ=trueなら道路と同じ向き)
 P_(L,GB,w,.75,d,x,.55,z,col);P_(L,GB,wc,.62,dc,x,1.2,z,0x1c2430);P_(L,GB,wc-.1,.08,dc-.1,x,1.55,z,col);
 for(const a of[-1,1])for(const b of[-1,1])P_(L,GB,aZ?.2:.7,.5,aZ?.7:.2,x+a*(aZ?.9:1.4),.25,z+b*(aZ?1.4:.9),0x151515)}
/* カーブ: 道路の中心線を「走った距離D」に沿った固定の形として持つ。カーブは遠くに現れて近づき、道路も地形(木・建物)もその曲がりに沿ってそのまま流れてくる(急に全体がぐにゃっと曲がらない) */
let D=0,curves=[],curveEnd=0,thBase=0,skyRot=0;
const CN=140,XT=new Float32Array(CN),PT=new Float32Array(CN);   // 点i は 自車から前へ(30-3i)の位置。XT=中心線の横ずれ、PT=自車の向きに対する道の向き
function thetaAt(s_){let t=0;for(const c of curves){const u=(s_-c.s0)/c.L;if(u<=0)continue;t+=c.A*c.L/Math.PI*(1-Math.cos(Math.PI*Math.min(1,u)))}return t}
function buildCurve(){
 while(curves.length&&curves[0].s0+curves[0].L<D-40){const c=curves.shift();thBase+=2*c.A*c.L/Math.PI}
 const tp=thetaAt(D);let k=0;for(const c of curves){const u=(D-c.s0)/c.L;if(u>0&&u<1)k+=c.A*Math.sin(Math.PI*u)}
 bend=Math.max(-1,Math.min(1,k/.008));skyRot=thBase+tp;   // bend=いま自車がいる場所の曲がり具合(-1〜1)。カメラの傾き・ハンドル・空に使う
 for(let i=0;i<CN;i++)PT[i]=thetaAt(D-30+3*i)-tp;
 XT[10]=0;for(let i=11;i<CN;i++)XT[i]=XT[i-1]+(PT[i]+PT[i-1])*1.5;
 for(let i=9;i>=0;i--)XT[i]=XT[i+1]-(PT[i]+PT[i+1])*1.5}
function spawnCurve(n_){if(ph=='solve'&&!cw&&n_>nextTurn&&D>=curveEnd){const L=rnd(120,170);curves.push({s0:D+190,L,A:(Math.random()<.5?-1:1)*rnd(.005,.008)});curveEnd=D+190+L;nextTurn=n_+rnd(2,5)}}
const cvI=z=>{const f=Math.min(CN-1.001,Math.max(0,(30-z)/3));return[f|0,f-(f|0)]},
 off=z=>{const[i,w]=cvI(z);return XT[i]*(1-w)+XT[i+1]*w},
 curveYaw=z=>{const[i,w]=cvI(z);return-(PT[i]*(1-w)+PT[i+1]*w)};
function place(o,x,z,yaw){o.position.set(x+off(z),o.position.y,z);o.rotation.y=curveYaw(z)+(yaw||0)}
const EL=-5.25,ER=8.75;
const pat=[];for(let i=0;i<40;i++)pat.push(Math.random()<.45);
function mkTex(lit){const c=document.createElement('canvas');c.width=64;c.height=128;const x=c.getContext('2d');x.fillStyle=lit?'#000':'#e8e8ee';x.fillRect(0,0,64,128);
 for(let i=0;i<4;i++)for(let j=0;j<10;j++){if(lit){if(pat[j*4+i]){x.fillStyle='#ffd27a';x.fillRect(6+i*15,6+j*12,9,7)}}else{x.fillStyle='#39425a';x.fillRect(6+i*15,6+j*12,9,7)}}
 return new THREE.CanvasTexture(c)}
const wallT=mkTex(0),emT=mkTex(1);
const bm=[0xd8d2c4,0xb8c4d8,0xc9b8b0,0xa9b5a0,0xd0c0d8,0x9fa7b5].map(c=>new THREE.MeshLambertMaterial({color:c,map:wallT,emissive:0xffffff,emissiveMap:emT,emissiveIntensity:0}));
const lampMat=new THREE.MeshLambertMaterial({color:0xffe9a8,emissive:0xffe9a8,emissiveIntensity:0});
const SGT={};function shopTex(l,col){const k=l+col;return SGT[k]||(SGT[k]=(()=>{const cn=document.createElement('canvas');cn.width=384;cn.height=64;const x=cn.getContext('2d');x.fillStyle=col;x.fillRect(0,0,384,64);
 x.strokeStyle='#fff';x.lineWidth=3;x.strokeRect(3,3,378,58);x.fillStyle='#fff';x.font='700 32px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(l,192,34);return new THREE.CanvasTexture(cn)})())}
/* 店: 名前と形をそろえる(看板・屋根・のれんなど) */
const SHOPS=[['ラーメン','#d83a2a',5,0,0xd8c8a8],['カフェ','#7a4a2a',5,0,0xe8d8c0],['スーパー','#1c9a50',6,1,0xeeeeee],['コンビニ','#1d6fe0',5,0,0xeeeef2],['学校','#8a7a5a',9,1,0xe4dcc0],['病院','#3a8ab8',11,1,0xf4f4f8],['居酒屋','#a8321a',5,0,0xc8a888],['薬局','#2ea86a',5,0,0xf0f4ee],['ファミレス','#e07a1a',5,0,0xf0e6d0],['パン屋','#c98a3a',4.5,0,0xf2dcb8],['寿司','#c0392b',5,0,0xe0d0b8],['本屋','#5a4a8a',6,0,0xe8e4f0]];
const gnd=new THREE.Mesh(GP,mat(0x2e4a33));gnd.scale.set(800,1,800);gnd.position.y=-.05;scene.add(gnd);
const LEN=320,world=[],slots=[];
function addW(m,t,x,z){scene.add(m);const o={m,x:x||0,z,t,sd:0};world.push(o);return o}
for(let i=0;i<40;i++){const g_=new THREE.Group();   // 一般道路(上り2車線+対向2車線)
 pl(g_,14,8.2,0x34363f,1.75,0,0);pl(g_,.15,8.2,0xeeeeee,-5.05,.012,0);pl(g_,.15,8.2,0xeeeeee,8.55,.012,0);
 pl(g_,.1,8.2,0xf3e9a0,1.6,.012,0);pl(g_,.1,8.2,0xf3e9a0,1.9,.012,0);
 pl(g_,3.2,8.2,0x8d8d95,-6.85,.02,0);pl(g_,3.2,8.2,0x8d8d95,10.35,.02,0);
 if(i%2==0){pl(g_,.18,3,0xeeeeee,-1.75,.012,-1);pl(g_,.18,3,0xeeeeee,5.25,.012,-1)}
 if(i%3==0)for(const sx of[-1,1]){const px=sx<0?-6.9:10.4;cy(g_,.07,6,0x555555,px,3,0);const h=new THREE.Mesh(GB,lampMat);h.scale.set(.6,.15,.4);h.position.set(px-sx*.5,6.1,0);g_.add(h)}
 addW(g_,'g',0,-i*8+8)}
const RAMPS=[{id:1,side:1,z:-105},{id:2,side:-1,z:-270}],RQ=12,rampH=zl=>{const q=10-zl;if(q<=0)return 0;if(q<RQ){const s_=q/RQ;return .3*RQ*(s_*s_*s_-s_*s_*s_*s_/2)}return .3*(RQ/2+q-RQ)},   // 外へ開く量: 傾きを0から.3へなめらかに増やす(かくっと曲がらない)
 rampA=zl=>{const q=10-zl;if(q<=0)return 0;const s_=Math.min(1,q/RQ);return Math.atan(.3*s_*s_*(3-2*s_))},rampX=(r,zl)=>r.side*(7.05+rampH(zl));   // 分岐(右)と出口(左)。zは世界と一緒に流れる
for(const r of RAMPS)for(let k=0;k<38;k++){const zl=24-k*6,g_=new THREE.Group(),a=-r.side*rampA(zl);
 for(const [w,x,c,y] of [[3.6,0,0x3a3c45,.022],[.15,r.side*1.8,0xeeeeee,.03],[.15,-r.side*1.8,0xeeeeee,.03]]){const q_=pl(g_,w,6.6,c,x,y,0);q_.rotation.y=a}
 addW(g_,'h',rampX(r,zl),((r.z+zl+310)%LEN+LEN)%LEN-310)}   // ランプは霧で見えなくなる遠くまで続ける(車が見える所で消えないように)
for(let i=0;i<40;i++){const g_=new THREE.Group();   // 高速(3車線)
 pl(g_,12.9,8.2,0x3a3c45,0,0,0);pl(g_,.15,8.2,0xeeeeee,-5.3,.012,0);pl(g_,.15,8.2,0xeeeeee,5.3,.012,0);
 if(i%2==0){pl(g_,.18,3,0xeeeeee,-1.75,.012,-1);pl(g_,.18,3,0xeeeeee,1.75,.012,-1)}
 const rl=[-1,1].map(sx=>bx(g_,.15,.8,8.2,0xaab0b8,sx*6.8,.5,0));   // ガードレール(ランプの所では消す)
 addW(g_,'h',0,-i*8+8).rl=rl}
for(let i=0;i<16;i++)for(const sd of[-1,1]){const L=[],cz=8-i*20;
 for(let k=0;k<24;k++){const ax=7+Math.pow(Math.random(),1.5)*54,lz=rnd(-10,10),tz=cz+lz;let skip=false;
  for(const r of RAMPS){const d=((tz-r.z+LEN/2)%LEN+LEN)%LEN-LEN/2;if(r.side==sd&&d<34&&d>-210&&ax<30)skip=true}   // 分岐・出口のランプには木を置かない
  if(sd<0&&ax<46&&Math.abs(((tz+150+LEN/2)%LEN+LEN)%LEN-LEN/2)<26)skip=true;   // サービスエリア
  if(skip)continue;
  treeI(L,sd*ax,lz,rnd(5,14)*(ax>28?1.15:1));
  if(Math.random()<.7)bushI(L,sd*Math.max(7.5,ax+rnd(-3,3)),lz+rnd(-3,3),rnd(.8,1.8))}
 const g_=new THREE.Group();pl(g_,62,20.5,0x1b3a22,sd*38,.01,0);g_.add(VM(L));addW(g_,'h',0,cz)}
{const g_=new THREE.Group();pl(g_,28,18,0x3d3f4a,-24,.03,0);bx(g_,14,5,8,0xeeeef2,-34,2.5,-2);bx(g_,14.2,.8,8.2,0x1d6fe0,-34,4.6,-2);   // サービスエリア(左)
 const s=new THREE.Mesh(GV,new THREE.MeshBasicMaterial({map:shopTex('サービスエリア','#1d6fe0')}));s.scale.set(7,1.2,1);s.rotation.y=Math.PI/2;s.position.set(-26.8,3.4,-2);g_.add(s);
 for(let k=0;k<4;k++)bx(g_,2,1.3,4.2,COL[k],-18-k*3.5,.9,5);addW(g_,'h',0,-150)}
[[-60,'分岐 1km ▶ ○○方面'],[-215,'出口 2km  ○○IC']].forEach(([z,t])=>{const g_=new THREE.Group();   // 緑の看板
 for(const sx of[-1,1])cy(g_,.12,6.8,0x777777,sx*7,3.4,0);bx(g_,14.4,.35,.35,0x777777,0,6.7,0);
 const p=new THREE.Mesh(GV,new THREE.MeshBasicMaterial({map:shopTex(t,'#0d6b3a')}));p.scale.set(7,1.4,1);p.position.set(0,5.6,0);g_.add(p);addW(g_,'h',0,z)});
/* 交差点・店の駐車場(道路の一部として固定。街と一緒に流れる) */
function mkSlot(sd,kind){const g_=new THREE.Group(),e=sd<0?EL:ER;
 if(kind=='turn'){pl(g_,48,7,0x34363f,e+sd*24,.035,0);pl(g_,48,.15,0xf3e9a0,e+sd*24,.045,0)}
 else{pl(g_,16,14,0x3d3f4a,e+sd*8,.035,0);bx(g_,10,5,8,0xeeeef2,e+sd*20.5,2.5,-2);bx(g_,10.2,.9,8.2,0x17a34a,e+sd*20.5,4.6,-2);bx(g_,10.2,.3,8.2,0xff7a1a,e+sd*20.5,3.9,-2);bx(g_,.2,2,5,0xffe9a8,e+sd*15.4,1.8,-2,0x665533);
  const s=new THREE.Mesh(GV,new THREE.MeshBasicMaterial({map:shopTex('コンビニ','#1d6fe0')}));s.scale.set(6,1.2,1);s.rotation.y=-sd*Math.PI/2;s.position.set(e+sd*15.2,3.4,-2);g_.add(s)}
 {const L=[];
  if(kind=='turn'){   // 曲がった先: 歩道と、道の両側に並ぶ建物・街路樹
   for(const sz of[-1,1]){pl(g_,48,2.4,0x8d8d95,e+sd*24,.04,sz*4.7);let u=4;
    for(let k=0;k<4;k++){const w=rnd(9,12),d=rnd(8,12),h=rnd(5,18),z=sz*(5.9+d/2),cx=e+sd*(u+w/2);
     P_(L,GB,w,h,d,cx,h/2,z,pick(WALL));if(h<8)P_(L,GPY,w*.72,2.4,d*.72,cx,h+1.2,z,pick(ROOF));
     for(let y=2.2;y<h-.8;y+=3)P_(L,GB,w*.85,1.1,.1,cx,y,sz*5.92,0x6a8ab0);
     u+=w+1}
    for(let k=0;k<4;k++)treeI(L,e+sd*(9+k*11),sz*4.6,rnd(3.5,5))}
   P_(L,GB,6,12,30,e+sd*51.5,6,0,pick(WALL))}
  else{   // コンビニの駐車場: 何台か止まっている
   for(const u of[5.5,10.5])for(let z=-5.5;z<5;z+=3)if(Math.random()<.6)carI(L,e+sd*u,z,false,pick(CARC));
   treeI(L,e+sd*13.5,-6.4,4);treeI(L,e+sd*13.5,6.4,4)}
  g_.add(VM(L))}
 return g_}
[[-40,1,'turn'],[-120,-1,'shop'],[-200,-1,'turn'],[-280,1,'shop']].forEach(([z,sd,k])=>{const o=addW(mkSlot(sd,k),'s',0,z);o.ssd=sd;o.kind=k;slots.push(o)});
const nearSlot=(sd,z)=>slots.some(s=>{if(s.ssd!=sd)return false;const d=Math.abs(((z-s.z)%LEN+LEN)%LEN);return Math.min(d,LEN-d)<17});
const EDG=sd=>sd<0?-EL:ER,SHOPSN=SHOPS.filter(s_=>s_[0]!='学校');
/* 1区画ぶんの景色を作る。sd=左右、uo=道路からの奥行きのずれ。学校には名前の看板を付けない */
function mkLot(sd,kind,uo){uo=uo||0;const g_=new THREE.Group(),L=[],X=u=>sd*(EDG(sd)+3.5+uo+u);let len=16;
 const lotCars=(rows,ln,pr)=>{for(const u of rows)for(let z=-ln/2+1.6;z<ln/2-1.2;z+=2.9)if(Math.random()<pr)carI(L,X(u),z,false,pick(CARC))};
 const tall=(w,d,h,s)=>{const b=new THREE.Mesh(GB,bm[Math.random()*6|0]);b.scale.set(w,h,d);b.position.set(X(s+w/2),h/2,0);g_.add(b)};
 if(kind=='shop'){const S_=pick(SHOPSN),big=S_[3],w=big?rnd(15,18):rnd(8,12),d=big?rnd(14,17):rnd(9,12),h=S_[2]+rnd(0,1.2),nm=S_[0],
   s=nm=='スーパー'?15:nm=='コンビニ'||nm=='ファミレス'?8:nm=='病院'?6:0;
  len=Math.max(d+3,s?17:0);
  if(s){pl(g_,s,len,0x3d3f4a,X(s/2),.03,0);lotCars(s>=14?[2.6,s-2.8]:s>=7?[s-2.5]:[2.4],len,.62)}   // 広い駐車場に車が止まっている
  P_(L,GB,w,h,d,X(s+w/2),h/2,0,S_[4]);
  const fcol=parseInt(S_[1].slice(1),16);
  P_(L,GB,.5,.35,Math.min(d*.9,9.5),X(s)-sd*.25,Math.min(h-1,4)-1,0,fcol);P_(L,GB,.2,2.2,Math.min(d*.5,5),X(s)-sd*.1,1.2,0,0x223344);
  if(nm=='病院'){P_(L,GB,.3,1.6,.5,X(s+w/2),h+.8,0,0xe03a3a);P_(L,GB,.3,.5,1.6,X(s+w/2),h+.8,0,0xe03a3a)}
  const sg=new THREE.Mesh(GV,new THREE.MeshBasicMaterial({map:shopTex(nm,S_[1])}));sg.scale.set(Math.min(d*.8,9),1.4,1);sg.rotation.y=-sd*Math.PI/2;sg.position.set(X(s)-sd*.06,Math.min(h-1,4),0);g_.add(sg);
  if(nm=='スーパー')for(let k=0;k<2;k++)treeI(L,X(.8),(k?1:-1)*(len/2-1),3.2)}
 else if(kind=='house'){const w=rnd(7,9),d=rnd(8,10),h=rnd(4,5.2),s=5.4,cx=X(s+w/2);len=d+5;   // 家: 屋根・玄関・窓・塀・庭木、車庫に車
  P_(L,GB,w,h,d,cx,h/2,0,pick(WALL));P_(L,GPY,w*.72,2.6,d*.72,cx,h+1.3,0,pick(ROOF));
  const fx=X(s)-sd*.06;P_(L,GB,.2,2.1,1.1,fx,1.05,d*.2,0x4a3022);for(const z of[-d*.28,d*.05])P_(L,GB,.15,1.1,1.5,fx,2.4,z,0x7aa8d0);
  P_(L,GB,.2,.8,d+1,X(.3),.4,0,0xd8d2c4);
  pl(g_,s-.6,3.2,0xb0b0b0,X(s/2+.2),.03,d/2-1.4);if(Math.random()<.65)carI(L,X(s/2+.2),d/2-1.4,false,pick(CARC));
  treeI(L,X(s*.5),-d/2+.8,rnd(3,4.5));bushI(L,X(s+.5),-d/2-.4,.8)}
 else if(kind=='apt'||kind=='plain'){const w=rnd(9,12),d=rnd(12,15),h=kind=='apt'?rnd(14,26):rnd(8,24),s=kind=='apt'?2:0;len=d+3;   // マンション・ビル
  tall(w,d,h,s);if(kind=='apt'){P_(L,GB,.3,2.6,3.2,X(s)-sd*.1,1.3,0,0x223344);for(let y=3.4;y<h-1;y+=3.2)P_(L,GB,.9,.14,d*.86,X(s)-sd*.45,y,0,0xd2d2d2)}}
 else if(kind=='hotel'){const w=12,d=15,h=rnd(22,34),s=5;len=d+3;   // ホテル: 屋上の看板、車寄せ
  tall(w,d,h,s);pl(g_,s,len,0x3d3f4a,X(s/2),.03,0);P_(L,GB,.3,3,4,X(s)-sd*.15,1.5,0,0x2a2230);P_(L,GB,2.4,.3,6,X(s)-sd*1.2,3.4,0,0x7a2a5a);lotCars([2.4],len,.5);
  const sg=new THREE.Mesh(GV,new THREE.MeshBasicMaterial({map:shopTex('HOTEL','#7a2a5a')}));sg.scale.set(9,1.7,1);sg.rotation.y=-sd*Math.PI/2;sg.position.set(X(s)-sd*.2,h+1.2,0);g_.add(sg)}
 else if(kind=='school'){const w=22,d=30,h=12,s=16;len=34;   // 学校: 大きな校舎・時計塔・グラウンド・ゴール・旗(名前の看板はなし)
  tall(w,d,h,s);P_(L,GB,4,6,4,X(s+w/2),h+3,0,0xd8d0b8);pl(g_,s,len,0xcdb98a,X(s/2),.03,0);
  for(const zc of[-9,9]){for(const z of[-1.8,1.8])P_(L,GB,.12,2.2,.12,X(6),1.1,zc+z,0xffffff);P_(L,GB,.12,.12,3.7,X(6),2.2,zc,0xffffff)}
  P_(L,GB,.15,9,.15,X(s+2),4.5,-d/2+1,0xcccccc);P_(L,GB,.05,1,1.4,X(s+2),8.5,-d/2+1.8,0xe03a3a);
  P_(L,GB,.08,1.1,len,X(.2),.55,0,0x4a6a4a);for(let k=0;k<5;k++)treeI(L,X(1.6),-14+k*7,rnd(4,6))}
 else if(kind=='park'){const wd=22;len=34;   // 公園: 芝・園路・池・木・ベンチ・すべり台・ブランコ
  pl(g_,wd,len,0x4f9a4a,X(wd/2),.03,0);pl(g_,wd,2.2,0xd8cfb8,X(wd/2),.04,0);pl(g_,2.2,len,0xd8cfb8,X(8),.04,0);pl(g_,8,10,0x3a78b8,X(16),.05,-9);
  P_(L,GB,.8,1,len,X(.4),.5,0,0x2f6a34);
  for(let k=0;k<9;k++)treeI(L,X(rnd(3,21)),rnd(-15,15),rnd(4,9));
  for(const z of[-5,5]){P_(L,GB,.6,.5,2,X(9.8),.3,z,0x8a5a2a);P_(L,GB,.1,.6,2,X(10.1),.7,z,0x8a5a2a)}
  P_(L,GB,1.6,2.4,1.6,X(15),1.2,9,0xe0a020);P_(L,GB,1.1,.12,3.6,X(15),1.2,11.6,0xd84a4a,-.5);
  for(const z of[-5.6,-2.4])P_(L,GB,.15,2.6,.15,X(18),1.3,z,0x888888);P_(L,GB,.15,.15,3.4,X(18),2.6,-4,0x888888);P_(L,GB,.5,.08,.5,X(18),.8,-4.6,0xd84a4a);P_(L,GB,.5,.08,.5,X(18),.8,-3.4,0x2c6fbb)}
 g_.add(VM(L));return{g:g_,len}}
const SLN=LEN/18;
for(const sd of[-1,1])for(let i=0;i<18;){const zb=-i*SLN+8;if(nearSlot(sd,zb)){i++;continue}
 const r=Math.random(),big=i<=15&&!nearSlot(sd,zb-SLN)&&!nearSlot(sd,zb-SLN*1.5);
 const kind=r<.34?'shop':r<.58?'house':r<.7?'apt':r<.76?'hotel':r<.84?'plain':big?(r<.92?'school':'park'):'house';
 const lot=mkLot(sd,kind,0),sk=Math.max(1,Math.round((lot.len+2)/SLN));
 addW(lot.g,'g',0,zb-(sk-1)*SLN/2);i+=sk}
/* 奥の街区(手前の建物のすき間から見える。公園・家・マンション・ホテル・駐車場が続く) */
for(const sd of[-1,1]){const items=[];let tot=0;
 for(let g=0;g<30;g++){const lot=mkLot(sd,pick(['house','house','house','apt','hotel','park','shop']),19+rnd(0,3));if(tot+lot.len>LEN-4)break;items.push(lot);tot+=lot.len}
 const gap=(LEN-tot)/items.length;let cur=gap/2;
 for(const lot of items){const zc=8-cur-lot.len/2;if(!nearSlot(sd,zc))addW(lot.g,'g',0,zc);cur+=lot.len+gap}}
/* 遠くのビル(地平線がすかすかにならないように) */
for(const sd of[-1,1])for(let i=0;i<16;i++){const L=[];
 for(let k=0;k<6;k++){const w=rnd(12,24),d=rnd(10,18),h=rnd(14,48);P_(L,GB,w,h,d,sd*(EDG(sd)+3.5+62+rnd(0,35)+w/2),h/2,rnd(-10,10),pick([0xb8c0cc,0xa8b2c0,0xc8c0b8,0x9aa6b8,0xd0ccc4]))}
 addW(VM(L),'g',0,8-i*20)}
/* 空・太陽・月・雲・星(カーブに合わせて向きが変わる) */
const sky=new THREE.Group();scene.add(sky);
const stars=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(Array.from({length:240},(_,i)=>{const a=Math.random()*6.28,e=rnd(.15,1.3),r=200;return i%3==0?Math.cos(a)*Math.cos(e)*r:i%3==1?Math.sin(e)*r:Math.sin(a)*Math.cos(e)*-r}),3)),new THREE.PointsMaterial({color:0xffffff,size:1.4,transparent:true,opacity:0,fog:false}));
function discTex(core,glow,cr){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d'),g=x.createRadialGradient(128,128,40,128,128,128);
 g.addColorStop(0,glow+'aa');g.addColorStop(.4,glow+'33');g.addColorStop(1,glow+'00');x.fillStyle=g;x.fillRect(0,0,256,256);
 x.fillStyle=core;x.beginPath();x.arc(128,128,52,0,Math.PI*2);x.fill();
 if(cr){x.fillStyle='rgba(150,160,185,.35)';[[110,112,10],[146,140,13],[122,150,7],[150,108,6],[108,138,5]].forEach(([a,b,r])=>{x.beginPath();x.arc(a,b,r,0,Math.PI*2);x.fill()})}
 return new THREE.CanvasTexture(c)}
const sunS=new THREE.Sprite(new THREE.SpriteMaterial({map:discTex('#fff6c8','#ffd27a',0),transparent:true,fog:false,depthWrite:false})),
 moonS=new THREE.Sprite(new THREE.SpriteMaterial({map:discTex('#f1f3ff','#aabbff',1),transparent:true,fog:false,depthWrite:false}));
sunS.scale.set(85,85,1);moonS.scale.set(62,62,1);sky.add(sunS,moonS,stars);
const cloudMat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.9,fog:false,depthWrite:false}),clouds=[];
for(let i=0;i<9;i++){const g_=new THREE.Group();for(let j=0;j<5;j++){const m=new THREE.Mesh(GS,cloudMat);m.scale.set(rnd(9,16),rnd(4,6),rnd(6,9));m.position.set(j*9-18+rnd(-3,3),rnd(-2,2),rnd(-4,4));g_.add(m)}
 g_.position.set(rnd(-140,140),rnd(55,90),-rnd(100,190));sky.add(g_);clouds.push(g_)}
const hood=new THREE.Mesh(GB,mat(0x15161d));hood.scale.set(2,.4,1.7);hood.position.set(0,-.82,-1.55);camera.add(hood);
const SKY=[[0,0x050816],[5,0x1b2150],[6.5,0xf2a07b],[8,0x8ec5ff],[12,0x6fb9ff],[16,0x8ec5ff],[18,0xff9a6b],[19.5,0x3b2a5e],[21,0x070b1c],[24,0x050816]],cTmp=new THREE.Color(),sc2=new THREE.Color();scene.background=cTmp;
const WX={clear:{n:'快晴',cl:2,gr:0,sd:1},fine:{n:'晴れ',cl:6,gr:0,sd:1},cloudy:{n:'くもり',cl:9,gr:1,sd:.45}};
function rollSky(){const b=pick([[5.3,8.4],[9.2,15.4],[16,18.6],[19.8,23.8]]);tod=rnd(b[0],b[1]);wx=pick(['clear','fine','fine','cloudy'])}
function applyDay(dt){
 for(let i=0;i<SKY.length-1;i++){const a=SKY[i],b=SKY[i+1];if(tod>=a[0]&&tod<=b[0]){cTmp.setHex(a[1]).lerp(sc2.setHex(b[1]),(tod-a[0])/(b[0]-a[0]));break}}
 if(WX[wx].gr)cTmp.lerp(sc2.setHex(0x9aa5b4),.5*(1-night));scene.fog.color.copy(cTmp);const a=(tod-6)/12*Math.PI,el=Math.sin(a);night=Math.max(0,Math.min(1,(.15-el)/.3));
 hemi.intensity=(.3+.7*(1-night))*(WX[wx].gr?.85:1);sun.intensity=.9*(1-night)*WX[wx].sd;bm.forEach(m=>m.emissiveIntensity=night*1.2);lampMat.emissiveIntensity=night;stars.material.opacity=night;
 sunS.position.set(-Math.cos(a)*130,Math.sin(a)*110,-185);sunS.material.opacity=Math.max(0,Math.min(1,(sunS.position.y+5)/25))*WX[wx].sd;
 const my=-Math.sin(a)*110;moonS.position.set(Math.cos(a)*100,45+Math.max(my,0)*.5,-185);moonS.material.opacity=Math.max(0,Math.min(1,(my-10)/40));   // 月は高い空に出る
 cloudMat.color.setRGB(1-.75*night-WX[wx].gr*.3,1-.72*night-WX[wx].gr*.3,1-.6*night-WX[wx].gr*.25);clouds.forEach((c,i)=>c.visible=i<WX[wx].cl);for(const c of clouds){c.position.x+=dt*1.5;if(c.position.x>160)c.position.x=-160}
 sky.rotation.y=skyRot}   // 道路のカーブに合わせて空も回る

/* ---------- 車(側面の形を押し出して丸みを付ける) ---------- */
const PROF={
 sedan:{L:4.4,w:1.8,pts:[[-2.2,.35],[-2.26,.6],[-2.05,.9],[-1.45,.95],[-.8,1.32],[.35,1.34],[1,.98],[2.05,.9],[2.26,.62],[2.2,.35]],tl:.62,hl:.66,pl:.5,rg:[3,.5,.75],fg:[5,.5,.78],sw:[1.2,.3,1.1,.25]},
 suv:{L:4.5,w:1.9,pts:[[-2.25,.4],[-2.3,1],[-2.2,1.62],[-.3,1.68],[.6,1.25],[1.1,1.02],[2.15,.95],[2.3,.65],[2.25,.4]],tl:.95,hl:.78,pl:.72,rg:[1,.6,.5],fg:[3,.5,.95],sw:[1.38,.4,2,.2]},
 kei:{L:3.4,w:1.5,pts:[[-1.7,.35],[-1.75,1.1],[-1.6,1.78],[.2,1.8],[.85,1.15],[1.55,.98],[1.72,.65],[1.68,.35]],tl:.95,hl:.75,pl:.7,rg:[1,.6,.55],fg:[3,.5,.8],sw:[1.4,.5,1.4,.2]},
 van:{L:5.2,w:2,pts:[[-2.6,.4],[-2.65,2.4],[-2.4,2.65],[1.3,2.6],[1.9,1.5],[2.6,1.15],[2.66,.7],[2.62,.4]],tl:1.1,hl:.85,pl:.85,rg:[0,.75,.7],fg:[3,.55,1.2],sw:[2,.6,2.4,.3]},
 bus:{L:9,w:2.5,pts:[[-4.5,.5],[-4.55,3.1],[-4.3,3.35],[4.2,3.35],[4.55,3],[4.58,.6],[4.5,.5]],tl:1.2,hl:1.1,pl:1.3,rg:[0,.7,.9],fg:[4,.35,1.2],sw:[2.4,.8,7,0]}};
const GEO={};function bodyGeo(t){if(GEO[t])return GEO[t];const P=PROF[t],sh=new THREE.Shape(),d=P.w-.24;P.pts.forEach(([x,y],i)=>i?sh.lineTo(x,y):sh.moveTo(x,y));
 const g_=new THREE.ExtrudeGeometry(sh,{depth:d,bevelEnabled:true,bevelThickness:.12,bevelSize:.12,bevelSegments:3,curveSegments:6});g_.translate(0,0,-d/2);g_.rotateY(Math.PI/2);return GEO[t]=g_}
const PMC={},pm=(c,gd)=>PMC[c+'|'+gd]||(PMC[c+'|'+gd]=new THREE.MeshPhongMaterial({color:c,shininess:gd?160:70,specular:gd?0xffeeaa:0x666666,emissive:gd?0x9a6a00:0}));
const lmC={},lm=c=>lmC[c]||(lmC[c]=new THREE.MeshBasicMaterial({color:c}));
const GLS=new THREE.MeshBasicMaterial({color:0x121a28,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4});
function glass(g_,P,sp){const a=P.pts[sp[0]],b=P.pts[sp[0]+1],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy),nx=-dy/l,ny=dx/l;   // 窓(後ろ・前)を面に沿って貼る
 const m=new THREE.Mesh(GV,GLS);m.scale.set(P.w*.8,sp[2],1);m.position.set(0,a[1]+dy*sp[1]+ny*.14,-(a[0]+dx*sp[1]+nx*.14));m.rotation.x=Math.atan2(-ny,-nx);g_.add(m)}
function ell(p,sx,sy,sz,m,x,y,z){const o=new THREE.Mesh(GS,m);o.scale.set(sx,sy,sz);o.position.set(x,y,z);p.add(o);return o}
function plateTex(c){const cn=document.createElement('canvas');cn.width=256;cn.height=128;const x=cn.getContext('2d');
 x.fillStyle='#f4f4ee';x.fillRect(0,0,256,128);x.strokeStyle='#1c6b3a';x.lineWidth=6;x.strokeRect(3,3,250,122);
 x.fillStyle='#1c6b3a';x.textAlign='center';x.textBaseline='middle';x.font='700 24px sans-serif';x.fillText(c.reg+' '+c.cls,128,24);
 x.font='700 64px sans-serif';x.fillText(c.kana,42,92);x.fillStyle='#111';
 let fs=76;x.font='700 '+fs+'px monospace';const mw=x.measureText(c.dg).width;if(mw>158)fs=Math.floor(fs*158/mw);   // スマホは文字の幅が広いことがあるので、かなの右の枠に収まる大きさに合わせる
 x.font='700 '+fs+'px monospace';x.fillText(c.dg,167,88);return new THREE.CanvasTexture(cn)}
let STT,HLT;
function mkSparks(g_){if(!STT){let c=document.createElement('canvas');c.width=c.height=128;let x=c.getContext('2d');
  x.fillStyle='rgba(255,255,255,.95)';x.beginPath();x.moveTo(64,2);x.quadraticCurveTo(70,58,126,64);x.quadraticCurveTo(70,70,64,126);x.quadraticCurveTo(58,70,2,64);x.quadraticCurveTo(58,58,64,2);x.fill();
  const g=x.createRadialGradient(64,64,0,64,64,34);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(1,'rgba(255,220,100,0)');x.fillStyle=g;x.fillRect(0,0,128,128);STT=new THREE.CanvasTexture(c);
  c=document.createElement('canvas');c.width=c.height=128;x=c.getContext('2d');const h=x.createRadialGradient(64,64,0,64,64,64);h.addColorStop(0,'rgba(255,230,140,.9)');h.addColorStop(.5,'rgba(255,190,50,.35)');h.addColorStop(1,'rgba(255,170,0,0)');x.fillStyle=h;x.fillRect(0,0,128,128);HLT=new THREE.CanvasTexture(c)}
 const hs=new THREE.Sprite(new THREE.SpriteMaterial({map:HLT,color:0xffd24a,transparent:true,opacity:.55,depthWrite:false,blending:THREE.AdditiveBlending}));hs.scale.set(11,6,1);hs.position.y=1.1;g_.add(hs);
 const a=[hs];for(let i=0;i<12;i++){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:STT,color:0xfff0b0,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));g_.add(sp);a.push(sp)}return a}
function animSparks(a,top,n){a[0].material.opacity=.45+.2*Math.sin(n*4);
 for(let i=1;i<a.length;i++){const s_=a[i],u=(n*.55+i*.37)%1,ang=n*.9+i*2.1,tw=.5+.5*Math.sin(n*9+i*2.3);
  s_.position.set(Math.cos(ang)*1.5,.3+u*(top+.6),Math.sin(ang)*2.6);s_.scale.setScalar(.55+tw*1.1);s_.material.opacity=tw*(1-u*.5);s_.material.rotation=n*2+i}}
function makeCar(type,col,pt,glow,gd){
 const P=PROF[type],g_=new THREE.Group(),wr=P.w>1.95?.42:.34,rz=Math.abs(P.pts[1][0])+.14,fz=P.pts[P.pts.length-2][0]+.14;
 g_.add(new THREE.Mesh(bodyGeo(type),pm(col,gd)));glass(g_,P,P.rg);glass(g_,P,P.fg);
 bx(g_,P.w+.02,P.sw[1],P.sw[2],0x121a28,0,P.sw[0],P.sw[3]);
 for(const sx of[-1,1]){ell(g_,.22,.07,.05,lm(0xff2a2a),sx*(P.w/2-.32),P.tl,rz);ell(g_,.22,.09,.05,lm(0xfff4c8),sx*(P.w/2-.32),P.hl,-fz)}
 const bl=[-1,1].map(sx=>{const b=ell(g_,.12,.07,.05,lm(0xffa31a),sx*(P.w/2-.1),P.tl,rz+.01);b.visible=false;return b});
 const pp=new THREE.Mesh(new THREE.PlaneGeometry(glow?.95:.52,glow?.475:.26),new THREE.MeshBasicMaterial({map:pt}));pp.position.set(0,P.pl,rz+.02);g_.add(pp);
 const fw=[];
 for(const sx of[-1,1])for(const sz of[-1,1]){const pv=new THREE.Group();pv.position.set(sx*(P.w/2-.04),wr,sz*P.L*.3);
  cy(pv,wr,.28,0x111111,0,0,0,1);cy(pv,wr*.55,.3,0xb8bcc8,0,0,0,1);g_.add(pv);if(sz<0)fw.push(pv)}
 g_.userData={fw,bl,top:P.pts[3][1]+.3};
 if(glow){const fx=g_.userData.fx=[],gc=gd?0xffd24a:0xffe14a,gms=(gd?[1,.55,.28]:[.5,.22]).map(o=>new THREE.MeshBasicMaterial({color:gc,side:THREE.BackSide,transparent:true,opacity:o,depthWrite:false,blending:THREE.AdditiveBlending}));
  (gd?[[1.09,1.14,1.05],[1.2,1.3,1.1],[1.38,1.6,1.2]]:[[1.06,1.1,1.035],[1.14,1.22,1.07]]).forEach((s,i)=>{const m=new THREE.Mesh(bodyGeo(type),gms[i]);m.scale.set(s[0],s[1],s[2]);g_.add(m);fx.push(m)});g_.userData.gm=gms;
  if(gd){const L_=new THREE.PointLight(0xffd24a,2.6,34);L_.position.set(0,2.5,2);g_.add(L_);fx.push(L_);g_.userData.sparks=mkSparks(g_);fx.push(...g_.userData.sparks)}}   // 金の車は夜でも光って、きらきら
 return g_}
const carMeta=()=>({reg:pick(REG),cls:300+(Math.random()*300|0),kana:KANA[Math.random()*12|0],dg:two()+'-'+two()}),TYPES=['sedan','suv','kei','van','sedan','suv','sedan','bus'];
const rcar=()=>{const g_=makeCar(pick(TYPES),pick(COL),plateTex(carMeta()),0,0);scene.add(g_);return g_};
const lanesNow=()=>st=='play'&&mode=='hwy'?[-3.5,0,3.5]:[-3.5,0];
const laneK=lx=>st=='play'&&mode=='hwy'?(lx<0?rnd(-.35,-.1):lx==0?rnd(-.1,.12):rnd(.1,.3)):rnd(-.2,.2);
const laneN=(l,c)=>npcs.filter(o=>!o.dead&&o!==c&&Math.abs(o.lx-l)<2&&o.z>-140&&o.z<30).length,pickLane=(Ls,c)=>{const m=Math.min(...Ls.map(l=>laneN(l,c)));return pick(Ls.filter(l=>laneN(l,c)<=m+1))};
const mkNpc=(z,lx)=>({g:rcar(),z,lx,x:lx,k:laneK(lx),t:rnd(4,12)});
function bestZ(lx,c,a,b){let bz=-rnd(a,b),bd=-1;   // 同じ車線の前後の車から、いちばん離れた位置に車を出す(車の波が偏らない)
 for(let i=0;i<12;i++){const z=-rnd(a,b);let d=1e9;
  for(const o of npcs){if(o===c||o.dead)continue;if(Math.abs(o.lx-lx)<2||Math.abs(o.x-lx)<2)d=Math.min(d,Math.abs(o.z-z))}
  for(const l of leavers)if(Math.abs(l.x-lx)<2.6)d=Math.min(d,Math.abs(l.z-z));
  if(tg&&Math.abs(tg.x-lx)<2.6)d=Math.min(d,Math.abs(tg.z-z));
  if(d>bd){bd=d;bz=z}}
 return bz}
function clear(x,z,self){return!(Math.abs(x)<2.6&&Math.abs(z)<13)&&!leavers.some(l=>Math.abs(l.z-z)<13&&Math.abs(l.x-x)<2.6)&&!npcs.some(o=>o!==self&&Math.abs(o.z-z)<13&&Math.abs(o.x-x)<2.6)&&!(tg&&ph!='cross'&&Math.abs(tg.z-z)<13&&Math.abs(tg.x-x)<2.6)}
/* 車線変更の安全確認: 「いま空いているか」だけでなく、行き先の車線の前後の車との速さの差(追いつかれる・追いつく)も見て、余裕があるときだけ変える */
const vgOf=o=>o.vg!==undefined?o.vg:Math.max(curS,10)*(1-(o.k||0))+(o.lv||0),
 vLane=x=>Math.max(curS,10)*(1-(st=='play'&&mode=='hwy'?(x<0?-.225:x==0?.01:.2):0));   // 車線変更したあとに出す速さの目安
function laneSafe(x,c,vc){
 if(!clear(x,c.z,c))return false;
 if(vc===undefined)vc=vLane(x);
 const B=st=='play'&&mode=='hwy'?28:16;   // 高速は車線変更に必要な間隔を広くする
 for(const o of npcs){if(o===c||o.dead)continue;
  if(Math.abs(o.x-x)>=2.8&&Math.abs(o.lx-x)>=2.8)continue;   // 行き先の車線にいる(これから入ってくる)車だけ見る
  const g=o.z-c.z,vo=vgOf(o);
  if(g<=0){if(-g<B+Math.max(0,vc-vo)*3)return false}      // 前の車: 追いつく速さの差が大きいほど、広く空いていること
  else if(g<B+Math.max(0,vo-vc)*4)return false}           // 後ろの車: 追いつかれる速さの差が大きいほど、広く空いていること
 return true}
/* 高速の出口・分岐: 本線の車線から、ランプの道の中心へなめらかにつなぐ(道路の上を走る) */
const exX=(r,L,zl)=>{const u=Math.min(1,Math.max(0,(24-zl)/20)),e=u*u*(3-2*u);return L+(rampX(r,zl)-L)*e};
for(let i=0;i<7;i++){const lx=i%3==2?0:-3.5;npcs.push(mkNpc(bestZ(lx,null,lx==0?52:22,150),lx))}
/* ---------- 通行人 ---------- */
const PE={baby:'🧸',kid:'⚽',gpa:'🦯',gma:'🧺',man:'💼',woman:'👜',run:'🥤'},PTY=['baby','kid','gpa','gma','man','woman','stu','run'];
const SKIN=[0xf6d9c2,0xedc3a0,0xdba879,0xbb8057],HCOL=[0x14110e,0x2a1a10,0x4a2c17,0x6b4a2b,0x8b5a2b,0x1f1a2e],GRY=0xdadada;
function hairI(L,t,c){const cap=()=>P_(L,GS6,.118,.1,.128,0,.8,-.012,c);
 if(t=='short'){cap();P_(L,GB,.235,.07,.11,0,.73,-.05,c)}
 else if(t=='long'){cap();P_(L,GB,.25,.4,.07,0,.6,-.105,c);for(const sx of[-1,1])P_(L,GB,.03,.2,.1,sx*.115,.7,-.03,c)}
 else if(t=='bob'){P_(L,GS6,.128,.11,.135,0,.79,-.02,c);P_(L,GB,.27,.2,.2,0,.69,-.055,c)}
 else if(t=='pony'){cap();P_(L,GS6,.05,.05,.05,0,.78,-.135,c);P_(L,GB,.05,.24,.05,0,.64,-.15,c)}
 else if(t=='bun'){cap();P_(L,GS6,.065,.065,.065,0,.91,-.05,c)}
 else if(t=='twin'){cap();for(const sx of[-1,1]){P_(L,GS6,.04,.04,.04,sx*.13,.8,-.04,0xe85a8a);P_(L,GB,.045,.26,.045,sx*.14,.66,-.05,c)}}
 else if(t=='spiky'){cap();for(let i=-1;i<=1;i++)P_(L,GCone,.04,.1,.04,i*.06,.9,-.02,c)}
 else if(t=='curly'){for(let i=0;i<6;i++){const a=i/6*6.28;P_(L,GS6,.05,.05,.05,Math.cos(a)*.1,.8,Math.sin(a)*.1,c)}cap()}
 else if(t=='thin'){P_(L,GB,.235,.09,.1,0,.74,-.06,c);P_(L,GS6,.07,.04,.1,0,.84,-.03,c)}}
function hatI(L,t,c){
 if(t=='cap'){P_(L,GS6,.125,.085,.13,0,.84,-.005,c);P_(L,GB,.18,.02,.14,0,.82,.13,c)}
 else if(t=='yellow'){P_(L,GS6,.13,.095,.135,0,.845,0,0xffd21f);P_(L,GB,.2,.02,.12,0,.81,.12,0xffd21f)}
 else if(t=='straw'){P_(L,GC6,.24,.02,.24,0,.84,0,0xe0c070);P_(L,GS6,.12,.07,.12,0,.86,0,0xe0c070);P_(L,GC6,.125,.03,.125,0,.86,0,c)}
 else if(t=='band'){P_(L,GB,.24,.04,.25,0,.82,0,c)}}
const pk=a=>a[Math.random()*a.length|0];
function pedSpec(type){const sk=pk(SKIN),hc=pk(HCOL),s_={h:1,v:2.4,sk,lean:0,amp:1,fw:1,run:0,skirt:0,legL:sk,shoe:0x222222,acc:[],hat:null,shirt:0,tie:0};
 if(type=='man'){const c=pk([0x2a2f3d,0x3a3f4a,0x1d2a44,0x4a4a52]);Object.assign(s_,{top:c,sleeve:c,fore:c,bot:c,legU:c,legL:c,shirt:0xffffff,tie:pk([0xb02020,0x2a4a9a,0x2a7a4a,0x6a2a8a]),shoe:0x1a1a1a,hair:{s:pk(['short','spiky','short']),c:hc},acc:['case']})}
 else if(type=='woman'){const c=pk([0x3a4a6a,0xb8a890,0x6a6a72,0x8a3a4a,0x2f2f3a]),sh=Math.random()<.5;Object.assign(s_,{fw:.9,top:c,sleeve:c,fore:c,shirt:0xffffff,bot:sh?c:0x2b3040,legU:sh?sk:0x2b3040,legL:sh?sk:0x2b3040,skirt:sh,shoe:0x3a2a2a,bagc:pk([0x8a3a4a,0x3a4a8a,0xb8895a]),hair:{s:pk(['long','bob','pony','bun']),c:hc},acc:['bag']})}
 else if(type=='stu'){const boy=Math.random()<.5,c=pk([0x232a4a,0x1c1c24]);Object.assign(s_,{h:.95,top:c,sleeve:c,fore:c,shirt:0xffffff,tie:pk([0xc02030,0x2a4a9a]),fw:boy?1:.9,pcol:pk([0x2a2f3d,0x4a5a8a,0x8a3a4a,0x2a7a5a]),shoe:0x3a2a22,
   bot:boy?0x3a3f55:0x5a5f78,skirt:!boy,legU:boy?0x3a3f55:sk,legL:boy?0x3a3f55:0xf4f4f4,hair:{s:boy?pk(['short','spiky']):pk(['twin','pony','bob','long']),c:hc},acc:['pack']})}
 else if(type=='kid'){const boy=Math.random()<.5,c=pk([0xe8505b,0x2fb67c,0xf5b82e,0x4a7bd8,0xf08a3c]);Object.assign(s_,{h:.72,v:2.2,top:c,sleeve:c,fore:sk,bot:boy?pk([0x2c4a8a,0x6a5a3a]):pk([0x8a5ac8,0xd8508a]),legU:boy?pk([0x2c4a8a,0x6a5a3a]):pk([0x8a5ac8,0xd8508a]),skirt:!boy,shoe:0xf0f0f0,rcol:pk([0xc02020,0x1c1c24,0x2a4aa0,0xc02020]),hair:{s:boy?'short':pk(['twin','bob','pony']),c:hc},hat:{s:'yellow',c:0xffd21f},acc:['rando']});s_.legU=s_.bot}
 else if(type=='gpa'){const c=pk([0x6a6a52,0x8a7a5a,0x5a6a7a]);Object.assign(s_,{h:.93,v:1.9,lean:.2,amp:.45,top:c,sleeve:c,fore:c,shirt:0xffffff,bot:pk([0x7a6a52,0x55555e]),shoe:0x3a3a3a,hair:{s:'thin',c:GRY},hat:Math.random()<.5?{s:'cap',c:pk([0x3a4a6a,0x6a5a3a])}:null,acc:['cane']});s_.legU=s_.legL=s_.bot}
 else if(type=='gma'){const c=pk([0xb06a9a,0x8a6ac8,0x4aa0a0,0xd88a8a]);Object.assign(s_,{h:.88,v:1.8,lean:.22,amp:.4,fw:.92,top:c,sleeve:c,fore:c,bot:pk([0x5a4a6a,0x4a4a52,0x7a5a4a]),skirt:1,skirtH:.55,legU:0xd8c0a0,legL:0xd8c0a0,shoe:0x3a3a3a,bagc:0x8a5a3a,hair:{s:pk(['curly','bun']),c:GRY},hat:Math.random()<.4?{s:'straw',c:0xc04a5a}:null,acc:[pk(['bag','cane'])]})}
 else if(type=='run'){Object.assign(s_,{v:3.3,run:1,lean:.22,amp:1.5,top:pk([0xff5a3a,0x2fb6d0,0xf0d020,0x8a5ad8]),sleeve:sk,fore:sk,bot:0x1f2430,legU:0x1f2430,shoe:0xff5a3a,hair:{s:pk(['pony','short','spiky']),c:hc},hat:Math.random()<.5?{s:pk(['cap','band']),c:pk([0xeeeeee,0x2a2a2a,0xff5a3a])}:null,acc:['bottle']})}
 else{const c=pk([0xe8c8d0,0x8ab8a8,0xd8d0b0]);Object.assign(s_,{h:.98,v:2.2,top:c,sleeve:c,fore:c,bot:0x3a4a6a,legU:0x3a4a6a,legL:0x3a4a6a,shoe:0xeeeeee,hair:{s:pk(['long','bob','pony']),c:hc},stroller:1})}
 return s_}
function pedModel(s_){const root=new THREE.Group(),mt=new THREE.MeshLambertMaterial({vertexColors:true,transparent:true,opacity:1}),M=L=>new THREE.Mesh(mergeG(L),mt),fw=s_.fw;
 const legs=[-1,1].map(sx=>{const L=[];P_(L,GB,.15,.46,.17,0,-.23,0,s_.legU);P_(L,GB,.13,.4,.15,0,-.66,0,s_.legL);P_(L,GB,.15,.09,.27,0,-.875,.05,s_.shoe);const g=new THREE.Group();g.add(M(L));g.position.set(sx*.1,.92,0);root.add(g);return g});
 const up=new THREE.Group();up.position.y=.92;up.rotation.x=s_.lean;root.add(up);
 const T=[];P_(T,GB,.42*fw,.6,.23,0,.3,0,s_.top);P_(T,GB,.4*fw,.12,.22,0,.03,0,s_.bot);
 if(s_.skirt){const sh=s_.skirtH||.28;P_(T,GB,.47*fw,sh,.3,0,.05-sh/2,0,s_.bot)}
 if(s_.shirt){P_(T,GB,.11,.34,.012,0,.4,.118,s_.shirt);P_(T,GB,.16,.04,.2,0,.6,0,s_.shirt)}
 if(s_.tie)P_(T,GB,.04,.26,.014,0,.36,.126,s_.tie);
 P_(T,GC6,.05,.08,.05,0,.64,0,s_.sk);P_(T,GS6,.105,.125,.115,0,.76,0,s_.sk);
 for(const sx of[-1,1])P_(T,GS6,.014,.014,.014,sx*.04,.77,.108,0x222222);
 hairI(T,s_.hair.s,s_.hair.c);if(s_.hat)hatI(T,s_.hat.s,s_.hat.c);
 for(const a of s_.acc){
  if(a=='rando'){P_(T,GB,.32,.36,.17,0,.33,-.21,s_.rcol);P_(T,GB,.3,.1,.18,0,.5,-.21,0xe8c020);for(const sx of[-1,1])P_(T,GB,.05,.34,.02,sx*.12,.33,.13,0xf0f0f0)}
  else if(a=='pack'){P_(T,GB,.34,.42,.15,0,.32,-.19,s_.pcol);for(const sx of[-1,1])P_(T,GB,.05,.34,.02,sx*.12,.33,.13,0x333333)}}
 up.add(M(T));
 const arms=[-1,1].map(sx=>{const A=[];P_(A,GB,.095,.3,.105,0,-.15,0,s_.sleeve);P_(A,GB,.08,.28,.09,0,-.44,0,s_.fore);P_(A,GS6,.05,.05,.05,0,-.6,0,s_.sk);
  if(sx>0)for(const a of s_.acc){
   if(a=='case')P_(A,GB,.05,.28,.38,0,-.8,0,0x3a2a1a);
   else if(a=='bag')P_(A,GB,.07,.2,.28,.02,-.72,0,s_.bagc||0x8a3a4a);
   else if(a=='cane'){P_(A,GC6,.016,.9,.016,0,-1.04,0,0x6a4a2a);P_(A,GS6,.03,.03,.03,0,-.58,0,0x6a4a2a)}
   else if(a=='bottle')P_(A,GC6,.03,.16,.03,0,-.66,.03,0x3a8ae0)}
  const g=new THREE.Group();g.add(M(A));g.position.set(sx*.255*fw,.56,0);up.add(g);return g});
 if(s_.stroller){const S_=[],c1=pk([0x6a8ad0,0xd88aa8,0x7ac0a0,0xe0b060]),c2=pk([0x4a6ab0,0xb86a88,0x5aa080,0xc09040]);   // ベビーカー(赤ちゃん入り)
  P_(S_,GB,.56,.035,.035,0,1.12,.5,0x333333);for(const sx of[-1,1]){P_(S_,GB,.03,.6,.03,sx*.27,.85,.7,0x555555,-.5);P_(S_,GB,.03,.3,.03,sx*.24,.27,.9,0x888888)}
  P_(S_,GB,.5,.05,.75,0,.4,1.0,0x555555);P_(S_,GB,.52,.2,.7,0,.52,1.0,c1);P_(S_,GB,.5,.3,.05,0,.7,.66,c1,-.3);
  P_(S_,GS6,.3,.26,.3,0,.84,.72,c2);P_(S_,GB,.46,.04,.4,0,.63,1.18,0xfff0a0);P_(S_,GS6,.075,.075,.075,0,.72,1.2,s_.sk);P_(S_,GS6,.08,.05,.08,0,.78,1.2,0xf0a0b0);
  for(const sx of[-1,1]){P_(S_,GC6,.14,.05,.14,sx*.26,.14,.72,0x222222,0,0,Math.PI/2);P_(S_,GC6,.06,.056,.06,sx*.26,.14,.72,0xbbbbbb,0,0,Math.PI/2);P_(S_,GC6,.09,.05,.09,sx*.24,.09,1.3,0x222222,0,0,Math.PI/2)}
  root.add(M(S_));arms.forEach(a=>a.rotation.x=-1)}
 root.scale.setScalar(s_.h);
 root.userData={legs,arms,up,mt,v:s_.v,sp:s_.v,run:s_.run,amp:s_.amp,carry:s_.acc.some(a=>a=='case'||a=='bag'||a=='cane'||a=='bottle'),stroller:!!s_.stroller,ph:Math.random()*6};
 scene.add(root);return root}
const mkPed=type=>pedModel(pedSpec(type));
const rmP=o=>{if(!o)return;scene.remove(o);o.traverse(x=>{if(x.geometry)x.geometry.dispose()});if(o.userData&&o.userData.mt)o.userData.mt.dispose()};
/* 歩き: 脚と腕を振る(跳ねない)。止まっているときは直立 */
function animPed(p,mv,thr,dt){const u=p.userData,A=(u.run?.9:.55)*u.amp,B=(u.run?1:.5)*u.amp;if(mv)u.ph+=dt*2.6*u.sp;const a=mv?Math.sin(u.ph):0;
 u.legs[0].rotation.x=a*A;u.legs[1].rotation.x=-a*A;
 if(!u.stroller){u.arms[0].rotation.x=-a*B;u.arms[1].rotation.x=a*B*(u.carry?.25:1)}
 if(thr)u.arms[1].rotation.x=-2.3+Math.sin(N()*10)*.35}
function emo(ch){const cn=document.createElement('canvas');cn.width=cn.height=128;const x=cn.getContext('2d');x.font='100px serif';x.textAlign='center';x.textBaseline='middle';x.fillText(ch,64,70);
 return new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cn),transparent:true,depthTest:false}))}



/* ---------- ゲーム進行 ---------- */
function pop(t){const d=document.createElement('div');d.className='pop';d.textContent=t;$('pops').appendChild(d);setTimeout(()=>d.remove(),1300)}
function flashFx(c){const f=$('fl');f.style.transition='none';f.style.background=c;f.style.opacity=.45;setTimeout(()=>{f.style.transition='opacity .4s';f.style.opacity=0},40)}
function shakeFx(){const s=$('stage');s.classList.remove('shk');void s.offsetWidth;s.classList.add('shk')}
const getP=()=>mode=='hwy'?.25:ph=='solve'||ph=='arrive'?Math.min(1,Math.max(0,(N()-t0)/T)):ph=='miss'?1:Math.min(1,Math.max(0,(okT-t0)/T));
const rm=o=>{if(o)scene.remove(o)};
const toOn=v=>{const t=$('to');t.style.display=v?'block':'none';t.classList.remove('bang');if(v){void t.offsetWidth;t.classList.add('bang')}$('ui').classList.toggle('dis',!!v)};
function mkLight(){const g_=new THREE.Group();for(let j=-5;j<=8;j++)pl(g_,.5,3.4,0xf2f2f2,j,.03,0);pl(g_,7,.4,0xf2f2f2,-1.75,.03,2.6);pl(g_,7,.4,0xf2f2f2,5.25,.03,-2.6);   // 縞と停止線(自車側・対向車側)
 cy(g_,.07,4.4,0x555555,9.6,2.2,2.2);bx(g_,.4,1.1,.4,0x222222,9.6,4.6,2.2);   // 車用の信号(右)
 const lr=new THREE.Mesh(GS,new THREE.MeshBasicMaterial({color:0xff2020})),lg_=new THREE.Mesh(GS,new THREE.MeshBasicMaterial({color:0x053305}));
 lr.scale.setScalar(.13);lg_.scale.setScalar(.13);lr.position.set(9.6,4.95,2.4);lg_.position.set(9.6,4.6,2.4);g_.add(lr,lg_);
 cy(g_,.07,3.4,0x555555,-7.2,1.7,-2.4);bx(g_,.6,1.25,.3,0x222222,-7.2,3.6,-2.4);   // 歩行者用の信号(左・こちら向き)
 const pr=new THREE.Mesh(GB,new THREE.MeshBasicMaterial({color:0xff2020})),pg=new THREE.Mesh(GB,new THREE.MeshBasicMaterial({color:0x053305}));
 pr.scale.set(.34,.36,.05);pg.scale.set(.34,.36,.05);pr.position.set(-7.2,3.92,-2.22);pg.position.set(-7.2,3.3,-2.22);g_.add(pr,pg);scene.add(g_);return{g:g_,lr,lg:lg_,pr,pg}}
const NPCN=()=>st=='play'&&mode=='hwy'?11:7;
function adopt(fast){if(!tg)return;const u=tg.g.userData;if(u.fx){u.fx.forEach(o=>tg.g.remove(o));u.fx=null;u.gm=null;u.sparks=null}u.fw.forEach(w=>w.rotation.y=0);
 npcs.push({g:tg.g,z:tg.z,lx:lanesNow().reduce((a,b)=>Math.abs(b-tg.x)<Math.abs(a-tg.x)?b:a),x:tg.x,k:-.1,t:rnd(3,6),lv:0,lvM:fast?26:mode=='hwy'?9:7,la:fast?16:9,dec:0});tg=null}
function leaveTg(e){const u=tg.g.userData;if(u.fx){u.fx.forEach(o=>tg.g.remove(o));u.fx=null;u.gm=null;u.sparks=null}u.fw.forEach(w=>w.rotation.y=0);
 leavers.push({g:tg.g,x:tg.x,z:tg.z,yaw:0,e,slot,dir,xt,vf:e.v});tg=null;slot=null}
const clearLeavers=()=>{leavers.forEach(o=>rm(o.g));leavers=[]};
function clearTg(){if(tg)rm(tg.g);tg=null;slot=null;ph='idle';exitS=null}
const oncHit=(s_,D,tl)=>{const zs=-40-D;return onc.some(o=>{const r=o.z-zs+o.v*tl;return r>-70&&r<12})},   // 曲がる時刻に対向車が来るか
 oncClear=s_=>!onc.some(o=>{const r=o.z-s_.z;return r>-70&&r<12});
function pickSlot(){const tl=t0+T-N(),c=[];for(const s of slots)for(let k=0;k<2;k++){const D=-40-s.z+LEN*k;if(D>0){const r=D/(tl*13);if(r>.7&&r<1.5&&(s.ssd<0||!oncHit(s,D,tl)))c.push({s,D})}}return c.length?pick(c):null}
function turnSafe(o){const vt=Math.max(0,o.e.v);   // 曲がる道を横切る車線に、通り過ぎていない車がいないか
 if(o.dir<0){for(const c of npcs){if(c.dead||(Math.abs(c.x+3.5)>2.6&&Math.abs(c.lx+3.5)>2.6))continue;const dz=c.z-o.z,vr=Math.max(0,(c.vg||0)-vt);if(dz<6+vr*2.2&&dz>-11)return false}}
 else{for(const q_ of onc){const dz=q_.z-o.z,v_=q_.vg===undefined?q_.v:q_.vg;if(dz<7&&dz>-(11+v_*2.4))return false}}
 return true}
function exitStep(o,dt){const e=o.e,dir=o.dir,hs=3.2;
 if(e.go){if(e.a<1.57){e.v+=(6.5-e.v)*Math.min(1,dt*1.6);e.a=Math.min(1.57,e.a+e.v/4.6*dt)}   // 曲がり始めたら最後まで曲がる
  else e.v+=((Math.abs(e.lx)>12&&o.xt=='shop'?0:6.5)-e.v)*Math.min(1,dt*(e.v>6.5?3:1.6))}
 else if(e.noturn)e.v+=(15-e.v)*Math.min(1,dt*.8);   // 長く待っても曲がれないときは、あきらめて直進
 else{const sf=turnSafe(o);e.wt=sf?0:e.wt+dt;if(e.wt>30)e.noturn=1;
  if(sf){const cap=Math.sqrt(42.25+10*Math.max(0,e.lz-hs));if(e.v>cap)e.v=Math.max(cap,e.v-9*dt);else if(e.v<6.5)e.v=Math.min(6.5,e.v+3.5*dt);if(e.lz<=hs)e.go=1}
  else if(e.lz>hs)e.v=Math.min(e.v,Math.sqrt(16*(e.lz-hs)));else e.v=Math.max(0,e.v-12*dt)}   // 安全になるまで曲がる手前で止まって待つ
 e.lx+=dir*Math.sin(e.a)*e.v*dt;e.lz-=Math.cos(e.a)*e.v*dt;
 o.x=e.lx;o.z=o.slot.z+e.lz;o.yaw=-dir*e.a;o.vf=e.v*Math.cos(e.a);
 return e.go&&e.a<1.4?-dir*.5:0}
function updLeavers(dt,S,n){for(let i=leavers.length-1;i>=0;i--){const o=leavers[i],u=o.g.userData,st_=exitStep(o,dt);
  if(o.slot.z>6||Math.abs(o.e.lx)>60){rm(o.g);leavers.splice(i,1);continue}
  place(o.g,o.x,o.z,o.yaw);u.fw.forEach(w=>w.rotation.y=st_);
  u.bl[0].visible=u.bl[1].visible=false;if(!o.e.noturn&&o.e.a<1.3&&Math.floor(n*2.6)%2==0)u.bl[o.dir<0?0:1].visible=true}}
function separate(){   // 最後の安全装置: 車どうし・自車と重ならない
 if(tg)for(const c of npcs){if(c.dead||Math.abs(c.x-tg.x)>=2.3||Math.abs(c.z-tg.z)>=7.0)continue;if(c.z>tg.z){c.z=tg.z+7.0;if(c.vg!==undefined)c.vg=Math.min(c.vg,curS)}else tg.z=c.z+7.0}
 for(let i=0;i<npcs.length;i++){const a=npcs[i];if(a.dead)continue;
  if(Math.abs(a.x)<2.3&&Math.abs(a.z)<7.0)a.z=a.z>=0?7.0:-7.0;
  for(let j=i+1;j<npcs.length;j++){const b=npcs[j];if(b.dead||Math.abs(a.x-b.x)>=2.3||Math.abs(a.z-b.z)>=7.0)continue;
   const bk=a.z>b.z?a:b,fr=bk===a?b:a;bk.z=fr.z+7.0;if(fr.vg!==undefined&&bk.vg!==undefined)bk.vg=Math.min(bk.vg,fr.vg)}}}
function playerLimit(){let lm=1e9;   // 自車: 前の車との間隔と、停止線までの距離から出していい速さ

 if(tg&&!tg.set&&tg.age>3.5&&!(cw&&cw.lt))lm=Math.min(lm,.55*(mode=='hwy'?25:13));   // 対象車が前に入れないときは自車が少し減速して、左の車に先に行ってもらう
 const room=tg&&tg.m>=1&&tg.m<9&&!(cw&&cw.lt&&!cw.go)?9:0;   // 対象の車が前にいる間は、その分だけ前の車との間隔を広めにあける
 for(const c of npcs)if(!c.dead&&c.vg!==undefined&&Math.abs(c.x)<2.4&&c.z<-2)lm=Math.min(lm,fol(-c.z-4.5-room,c.vg));
 if(tg&&cw&&cw.lt&&!cw.go)lm=Math.min(lm,fol(-tg.z-4.5,tg.vt));
 for(const l of leavers)if(Math.abs(l.x)<2.4&&l.z<-2)lm=Math.min(lm,fol(-l.z-4.5,l.vf));
 if(cw&&!cw.go)lm=Math.min(lm,stopV(-10-cw.z));
 return lm}
const spawnHit=(c,x0)=>!c.dead&&!(c.lv!==undefined&&(c.vg||0)>6)&&((Math.abs(c.x-x0)<2.7&&c.z>-42&&c.z<10)||(x0!=0&&Math.abs(c.x)<2.7&&c.z>-34&&c.z<-6));

function mergeOK(){   // 前に車線変更してよいか: 横断歩道・交差点の中ではしない。自車線の前に車がいないこと
 if(cw&&cw.z<=3)return false;
 if(mode!='hwy'&&slots.some(s=>s.kind=='turn'&&Math.abs(s.z-tg.z)<9))return false;
 for(const c of npcs){if(c.dead)continue;if((Math.abs(c.x)<2.8||Math.abs(c.lx)<2.8)&&c.z>-24&&c.z<0)return false}
 for(const c of npcs)if(!c.dead&&Math.abs(c.x)<2.8&&c.z>-50&&c.z<=-24&&c.vg!==undefined&&c.vg<curS+.5)return false;   // 自車線のすぐ前に、同じくらいの速さ以下の車がいるうちは入らない(入ったあと詰まるため)
 for(const l of leavers)if(Math.abs(l.x)<2.8&&l.z>-24&&l.z<4)return false;
 return true}
function settleTg(n){t0=n+.8;xt='straight';slot=null;   // 前に入り終わったら制限時間スタート。曲がる車かもここで決める
 if(!lt&&mode!='hwy'&&Math.random()<.55){const s_=pickSlot();if(s_){xt=s_.s.kind;dir=s_.s.ssd;slotDist=s_.D;slot=s_.s}}
 render()}
function fillFront(){   // 問題の車が来るまでの間、前に普通の車をおく(道が空っぽに見えないように)
 if(mode=='hwy'||N()<fillT)return;fillT=N()+1;
 const ah=npcs.filter(c=>!c.dead&&c.z<-16&&c.z>-130);
 if(ah.some(c=>Math.abs(c.lx)<2||Math.abs(c.x)<2))return;
 const c1=ah.filter(c=>Math.abs(c.lx+3.5)<2&&c.z<-28&&!c.fc&&c.lv===undefined&&!c.ex).sort((a,b)=>b.z-a.z)[0];
 if(c1&&laneSafe(0,c1)){c1.fc={t:N()+1,to:0};return}   // ウインカーを出して自車線へ
 if(clear(0,-85,null)){const c=mkNpc(-85,0);c.k=.08;npcs.push(c)}}
function newCar(){
 wrong=0;if(tg){rm(tg.g);tg=null}toOn(0);slot=null;
 if(cw&&(!cw.go||(cw.z<3&&N()-cw.goT<14))||leavers.some(l=>Math.abs(l.x)<3.4&&l.z<12&&l.z>-80)){if(cw)fillFront();if(ph!='wait'){ph='wait';render()}return}   // 横断歩道を完全に過ぎるまで次の車は出さない(待っている間は前に普通の車をおく)   // 横断歩道が終わるまで・前の曲がる車が行くまで次の車は出さない
 if(!plan){const cntL=l=>npcs.filter(o=>Math.abs(o.x-l)<2&&o.z>-70&&o.z<35).length,c1=cntL(-3.5),c2=cntL(3.5);
  plan={gold:mode!='hwy'&&Math.random()<.01?1:0,lt:mode!='hwy'&&Math.random()<.07?1:0,x0h:mode=='hwy'?(c1<c2?-3.5:c2<c1?3.5:Math.random()<.5?-3.5:3.5):-3.5,t:N()}}
 if(plan.lt){const b=npcs.filter(c=>!c.dead&&Math.abs(c.lx)<2&&c.z<-3&&c.z>-130);   // 信号待ちの場面では、自車の前の車線に他の車を並べない
  if(cw||b.some(c=>!clear(-3.5,c.z,c)||laneN(-3.5,c)>=3))plan.lt=0;else b.forEach(c=>{c.lx=-3.5;c.k=laneK(-3.5)})}
 const x0=plan.lt?0:plan.x0h;
 if(!plan.lt&&npcs.some(c=>spawnHit(c,x0))&&N()-plan.t<(mode=='hwy'?.5:1.2)){   // 車を消さずに、追い越しの邪魔な車が離れるのを少し待つ
  for(const c of npcs)if(c.lv===undefined&&spawnHit(c,x0))c.k=c.z<4?Math.min(c.k,-rnd(.3,.5)):Math.max(c.k,rnd(.25,.45));
  if(ph!='wait'){ph='wait';render()}return}
 const pl_=plan;plan=null;gold=pl_.gold;qm=gold?NEXT[mode]:mode;lt=pl_.lt;
 q=make(qm);ex=MODES[qm].perm?[]:[{t:'d',i:0}];ph=lt?'solve':'arrive';enter=N();Te=lt?5:mode=='hwy'?3:5;t0=enter+Te;   // 対象車が自車の前に入るまでの時間(高速3秒・ほか5秒)
 
 T=Math.max(MODES[mode].t*.6,MODES[mode].t-solved*.4)*(gold?.85:1)*(lt?1.5:1);
 xt='straight';slot=null;   // 曲がる車かどうかは、前に入ってきてから決める
 const c=carMeta();c.dg=''+q.d[0]+q.d[1]+'-'+q.d[2]+q.d[3];
 const g_=makeCar(pick(['sedan','suv','kei','van']),gold?0xffc400:pick(COL),plateTex(c),1,gold);
 tg={g:g_,x:x0,z:lt?-62:mode=='hwy'?5:9,yaw:0,x0,zo:-9,vt:12,m:lt?2:0,set:lt?1:0,sd:lt?1:0,vis:lt?1:0,age:0,bt:0};scene.add(g_);
 if(lt){startCross(true)}
 if(gold){pop('★ 金の車 出現!');sparkle()}
 render()}
function start(m){mode=m;st='play';score=0;combo=0;life=3;wrong=0;solved=0;log=[];rankLine='';spd=m=='hwy'?1:2;bend=bendS=0;nextTurn=N()+8;lastCross=0;paused=0;
 endCross();clearLeavers();plan=null;$('ov').style.display='none';$('cf').style.display='none';$('ui').style.display='flex';setTop();
 for(const c of npcs)if(!lanesNow().includes(c.lx)){c.lx=c.x=-3.5}
 for(const c of npcs){c.ex=0;c.home=undefined;c.dec=0;c.lv=undefined;c.lcT=undefined}
 for(let g=0;g<40&&npcs.length<NPCN();g++){const l=pick(lanesNow());npcs.push(mkNpc(bestZ(l,null,l==0?55:25,150),l))}
 rollSky();
 if(m=='hwy')hwEnd=N()+60;oncOn=m!='hwy'&&Math.random()<.6;oncT=N()+rnd(12,25);
 beep(600,.08);beep(900,.12,'square',.05,.08);newCar()}
function good(){
 const n=N(),bonus=mode=='hwy'?Math.max(0,Math.round(100-(n-enter)*12)):Math.round((1-getP())*100);
 log.push({dg:''+q.d[0]+q.d[1]+'-'+q.d[2]+q.d[3],sol:q.sol,ok:1,gold,tg:q.target});
 ph='ok';okT=n;adopt(0);slot=null;if(cw&&cw.lt)cw.done=1;combo++;solved++;
 const add=Math.round((100+bonus+combo*20)*MULT[qm]*(gold?2:1));score+=add;spd=Math.max(spd,mode=='hwy'?1:2);
 flashFx('#3f8');shakeFx();pop('+'+add+(gold?' ★':'')+(combo>1?'  '+combo+'COMBO':''));chime(combo);render()}
function bad(){shakeFx();flashFx('#f33');if(mode=='hwy')hwEnd-=2;else t0-=1.5;combo=0;ex=MODES[qm].perm?[]:[{t:'d',i:0}];beep(130,.25,'sawtooth',.07);
 if(mode!='hwy'){wrong++;if(wrong>=3){pop('ミス3回! ♥−1');miss();return}}   // 一般道路: 同じ車で3回まちがえたら残機が1つ減る(もう1つの条件は時間切れ)
 render()}
function miss(){
 log.push({dg:''+q.d[0]+q.d[1]+'-'+q.d[2]+q.d[3],sol:q.sol,ok:0,gold,tg:q.target});
 ph='miss';missT=N();life--;combo=0;if(cw&&cw.lt)cw.done=1;
 if(xt=='straight')adopt(1);   // まっすぐの車は加速して走り去る(前の車は避ける)
 else leaveTg({lx:tg.x,lz:tg.z-slot.z,a:0,v:Math.max(7,Math.min(13*spd,22)),wt:0,go:0,noturn:0});   // 曲がる車: 周りが安全になるまで待ってから曲がる
 toOn(1);shakeFx();bang();if(xt=='straight')vroom();else engine(2.2);render()}
function submit(){
 if(st!='play'||ph!='solve'||ex.length!=7)return;
 let ok=false;try{const v=ev(ex.map(e=>e.t=='d'?q.d[e.i]:e.v).join(''));ok=isFinite(v)&&Math.abs(v-q.target)<1e-9}catch(e){}
 ok?good():bad()}
function afterOk(){if(!lt&&mode!='hwy'&&!cw&&solved-lastCross>=2&&(life<3?Math.random()<.35:Math.random()<.08)){if(!startCross(false))newCar()}else newCar()}
const mkPeds=()=>{cw.th=pick(PTY);cw.born=N();return[cw.th,pick(PTY),pick(PTY)].map(mkPed)};
const CD=[1,-1,1],CST=[-6.2,10.4,-7.4];
function pickCrossZ(){   // 止まれる距離を確保しつつ、自車と横断歩道の間に車が並びすぎない位置を選ぶ
 const zmin=-((13*Math.max(spd,1.2))**2/12)-14;
 for(let z0=Math.min(-60,zmin);z0>-175;z0-=4){
  if(npcs.some(c=>!c.dead&&Math.abs(c.z-z0)<10)||onc.some(o=>Math.abs(o.z-z0)<10))continue;
  const bt=npcs.filter(c=>!c.dead&&c.z<-3&&c.z>z0+8),b0=bt.filter(c=>Math.abs(c.lx)<2);
  if(bt.length>3||b0.some(c=>!clear(-3.5,c.z,c)))continue;
  b0.forEach(c=>{c.lx=-3.5;c.k=laneK(-3.5)});return z0}
 return null}
function startCross(withCar){let z0=withCar?-85:pickCrossZ();if(z0===null)return false;
 if(withCar)while(z0>-170&&(npcs.some(c=>!c.dead&&Math.abs(c.z-z0)<10)||onc.some(o=>Math.abs(o.z-z0)<10)))z0-=5;
 if(!withCar){clearTg();ph='cross';lastCross=solved}const L=mkLight();   // 横断歩道は道路の一部(固定)。自車と周りの車が近づいて、停止線で止まる
 cw={lt:withCar,z:z0,st:'wait',wt:0,gt:0,dur:0,got:0,made:0,done:0,go:0,g:L.g,lr:L.lr,lg:L.lg,pr:L.pr,pg:L.pg,sp:null,peds:null};
 cw.peds=mkPeds();place(cw.g,0,cw.z,0);render();return true}
function endCross(){if(!cw)return;rm(cw.g);cw.peds.forEach(rmP);rm(cw.sp);cw=null}
const walkDur=()=>Math.max(...cw.peds.map((p,i)=>{const v=Math.max(p.userData.v,2.3);return(CD[i]>0?11.6-CST[i]:CST[i]+8.2)/v+(i==0&&!cw.lt?.8:0)}))+.6;
function halted(ww){   // 自車・前の車・周りの車・対向車がみんな止まって、横断歩道の上に車がいない。待ちが長引くほど「止まった」の基準をゆるめる(永久に赤のままにしない)
 const v=ww>6?2.5:.4;
 if(curS>(ww>6?2:.3)||(cw.z<-30&&ww<25))return false;if(cw.lt&&tg&&tg.vt>(ww>6?2:.3)&&!cw.go&&ww<10)return false;
 for(const c of npcs){if(c.dead||c.x>2.4||c.z>0)continue;
  if(!cw.lt&&c.z>cw.z-4.8&&c.z<cw.z+60&&(c.vg===undefined||c.vg>=(ww>12?1.5:.4)||c.lcT!==undefined||c.fc))return false;   // 自車の前にいる車(走り去る車・車線変更中の車も)が横断歩道を過ぎるか、完全に止まるまでは、歩行者を青にしない
  if(Math.abs(c.z-cw.z)<4.8&&!(ww>12&&(c.vg||0)<v))return false;const d=c.z-cw.z-6.5;if(d>-1.5&&d<30&&c.vg>v)return false}
 for(const o of onc){if(Math.abs(o.z-cw.z)<4.8&&!(ww>12&&(o.vg||0)<v))return false;const d=cw.z-o.z-6.5;if(d>-1.5&&d<30&&o.vg>v)return false}
 return true}
function clearOnCross(){   // 最後の手段: 横断歩道の上で止まったままの車を取りのぞいて、人が渡れるようにする
 for(const c of npcs)if(!c.dead&&c.x<=2.4&&Math.abs(c.z-cw.z)<4.8&&(c.vg||0)<2.5){c.dead=1;rm(c.g)}
 for(const o of onc)if(Math.abs(o.z-cw.z)<4.8&&(o.vg||0)<2.5){o.z=cw.z+60}}
function sigUpdate(n){const walk=cw.st=='walk'&&!(cw.dur-(n-cw.wt)<2.4&&Math.floor(n*3)%2==0);   // 歩行者は青(終わりぎわは点滅)・車は赤。人がいなくなったら逆
 cw.lr.material.color.set(cw.go?0x330808:0xff2020);cw.lg.material.color.set(cw.go?0x35ffa8:0x053305);
 cw.pr.material.color.set(walk?0x330808:0xff2020);cw.pg.material.color.set(walk?0x35ffa8:0x053305)}
function crossUpdate(n,dt,S){
 cw.z+=S*dt;if(cw.z>14){endCross();return}   // 横断歩道は道路と一緒に流れる(ついてこない)
 place(cw.g,0,cw.z,0);
 if(cw.st=='wait'){cw.ww=(cw.ww||0)+dt;if(cw.ww>12)clearOnCross();if(halted(cw.ww)){cw.st='walk';cw.wt=n;cw.dur=walkDur()}
  else if(cw.ww>25){const lt_=cw.lt;endCross();if(!lt_)newCar();return}}   // 25秒たっても止まれないときは、横断歩道そのものをなかったことにして続ける
 else if(cw.st=='walk'){if(n-cw.wt>=cw.dur){cw.st='gap';cw.gt=n}}
 else if(cw.st=='gap'&&n-cw.gt>1.5){
  if(cw.lt&&!cw.done){cw.peds.forEach(rmP);cw.peds=mkPeds();cw.made=0;cw.st='wait';cw.ww=0}   // 問題を解いている間は次の人たちが渡る
  else{cw.st='go';cw.go=1;cw.goT=n;if(!cw.lt)newCar()}}   // 人がいなくなったら車は青で進む
 sigUpdate(n);
 const ct=cw.st=='wait'?0:cw.st=='walk'?n-cw.wt:cw.dur,fade=Math.min(1,(n-cw.born)/1.4);
 cw.peds.forEach((p,i)=>{const u=p.userData,v=Math.max(u.v,2.3),a=1.4,b=2.2;let x,mv=cw.st=='walk'?1:0,th=0;
  if(i==0&&!cw.lt){if(ct<a)x=CST[0]+v*ct;else if(ct<b){x=CST[0]+v*a;mv=0;th=cw.st=='walk'?1:0}else x=CST[0]+v*(ct-(b-a))}   // 1人目は立ち止まって何かを投げる
  else x=CST[i]+CD[i]*v*ct;
  if(CD[i]>0?x>=11.6:x<=-8.2){x=CD[i]>0?11.6:-8.2;mv=0}
  u.sp=v;animPed(p,mv,th,dt);p.position.set(x+off(cw.z),0,cw.z-.9+i*.9);p.rotation.y=CD[i]>0?Math.PI/2:-Math.PI/2;u.mt.opacity=fade});
 if(!cw.lt&&cw.st=='walk'&&ct>1.6&&!cw.made&&!cw.got){cw.made=1;cw.sp=emo(cw.th=='stu'?pick(['🎒','📚','💻']):PE[cw.th]);scene.add(cw.sp);noise(.55,500,2600,.06)}
 if(cw.sp){const tt=Math.min(1,(ct-1.6)/.8),p0=cw.peds[0].position;
  cw.sp.position.set(p0.x*(1-tt),1.5*(1-tt)+1.1*tt+Math.sin(Math.PI*tt)*1.1,p0.z*(1-tt)-tt);cw.sp.scale.setScalar(.4+1.1*tt);cw.sp.material.rotation=tt*12;
  if(tt>=1&&!cw.got){cw.got=1;rm(cw.sp);cw.sp=null;const mx_=life>=3;life=Math.min(3,life+1);flashFx('#ff6b9a');pop(mx_?'♡ MAX':'♡+1');chime();beep(1500,.2,'sine',.04,.1)}}}
/* ---------- Xシェア ---------- */
function shareX(){
 const cars=mode=='oni'?`${solved}台のナンバーを解き切った!`:`${solved}台の車のナンバーを10にした!`;
 const t=`🚗「${NAME}」で${score}点!\n${lab(mode)}で${cars}\n${rankLine?'🏆 ランキング '+rankLine.split('/')[0]+'\n':''}キミは何点いける?\n${TAG}`;
 window.open('https://x.com/intent/post?text='+encodeURIComponent(t)+'&url='+encodeURIComponent(SHARE_URL),'_blank','noopener')}/* ---------- ランキング(Supabase。未設定なら端末内) ---------- */
const sbOn=!!(SB_URL&&SB_KEY);
async function rpc(fn,args){const base=SB_URL.replace(/\/rest\/v1\/?$/,'').replace(/\/+$/,'');   // URLの末尾に /rest/v1/ が付いていても大丈夫にする
 const h={'Content-Type':'application/json',apikey:SB_KEY};if(SB_KEY.startsWith('eyJ'))h.Authorization='Bearer '+SB_KEY;   // 新形式(sb_publishable_…)のキーはJWTではないので apikey だけ送る
 const r=await fetch(base+'/rest/v1/rpc/'+fn,{method:'POST',headers:h,body:JSON.stringify(args)});if(!r.ok){let t='';try{t=(await r.text()).slice(0,100)}catch(e){}throw new Error(r.status+' '+t)}const tx=await r.text();return tx?JSON.parse(tx):null}   // スコア登録は返事が空なので、空のときはそのまま終わる(SafariはここでJSONエラーになる)
const track=k=>{if(sbOn)rpc('count_event',{p_kind:k}).catch(()=>{})};   // アクセス数・プレイ数のカウント(失敗してもゲームには影響しない)
const localDB=()=>{try{return JSON.parse(localStorage.getItem('td_lrank')||'{}')}catch(e){return{}}};
async function submitScore(m,s,c){if(sbOn){await rpc('submit_score',{p_name:user,p_mode:m,p_score:s,p_cnt:c});return}
 const d=localDB();d[m]=d[m]||{};const o=d[m][user];if(!o||s>o.s)d[m][user]={s,c};try{localStorage.setItem('td_lrank',JSON.stringify(d))}catch(e){}}   // 高いスコアだけ保存
async function getRanking(m){if(sbOn)return(await rpc('get_ranking',{p_mode:m})).map(r=>({rank:+r.rank,name:r.name,score:r.score,cnt:r.cnt}));
 const d=localDB()[m]||{},a=Object.keys(d).map(n=>({name:n,score:d[n].s,cnt:d[n].c})).sort((x,y)=>y.score-x.score||(x.name<y.name?-1:1));
 return a.map(r=>({...r,rank:1+a.filter(x=>x.score>r.score).length}))}   // 同点は 1,2,2,4 の付け方
async function myRank(m){if(sbOn){const r=await rpc('my_rank',{p_name:user,p_mode:m});return r&&r.length?{rank:+r[0].rank,total:+r[0].total}:null}
 const a=await getRanking(m),me=a.find(r=>r.name==user);return me?{rank:me.rank,total:a.length}:null}
async function showRank(m){if(st!='rank')prev=st;if(!m&&st!='rank')rkMode=mode;st='rank';rkMode=m||rkMode;setTop();const mm=rkMode;
 ovShow(`<h2>ランキング</h2><div class="frame sm"><div class="ft">一般道路</div><div class="g2">${['easy','normal','hard','oni'].map(k=>`<button class="m${k==mm?' sel':''}" onclick="showRank('${k}')">${MODES[k].n}</button>`).join('')}</div></div>
 <div class="frame sm"><div class="ft">高速</div><button class="m wide${mm=='hwy'?' sel':''}" onclick="showRank('hwy')">タイムアタック</button></div>
 ${sbOn?'':'<p class="sub">※Supabase未設定: この端末の中だけのランキングです</p>'}<div id="rkb" class="rkwrap">読み込み中…</div>`);
 try{let rows=null,me=null;
  if(FULL_RANKING){rows=await getRanking(mm);const r=rows.find(x=>x.name==user);me=r?{rank:r.rank,total:rows.length}:null}else me=await myRank(mm);
  if(rkMode!=mm||st!='rank')return;
  let h=me?`<div class="mine">あなたの順位 <b>${me.rank}位</b> / ${me.total}人</div>`:'<div class="mine">スコアがありません</div>';
  if(FULL_RANKING)h+=`<div class="rk hd"><span>順位</span><span class="nm">ユーザー名</span><span>スコア</span><span>台数</span></div><div class="rklist">${rows.length?rows.map(r=>`<div class="rk${r.name==user?' me':''}"><span>${r.rank}</span><span class="nm">${esc(r.name)}</span><span>${r.score}</span><span>${r.cnt}台</span></div>`).join(''):'<div class="rk">まだ誰もいません</div>'}</div>`;
  $('rkb').innerHTML=h;const bx_=document.querySelector('.rklist'),mi=document.querySelector('.rk.me');if(bx_&&mi)bx_.scrollTop=mi.offsetTop-bx_.clientHeight/2+mi.clientHeight/2}   // 自分の行まで自動スクロール
 catch(e){const b=$('rkb');if(b)b.textContent='ランキングを読み込めませんでした('+(e&&e.message||e)+')'}}
/* ---------- 画面 ---------- */
const OPN={'+':'＋','-':'−','*':'×','/':'÷'},fmt=s=>s.replace(/[+\-*/]/g,c=>OPN[c]);
function ovShow(h){const o=$('ov');o.style.display='flex';o.innerHTML='<div class="ovin">'+h+'</div>';o.scrollTop=0}
function setTop(){const lo=st=='login',pl_=st=='play';
 $('top').style.display=lo?'none':'flex';
 $('bk').style.display=lo||st=='home'?'none':'inline-block';
 const u=$('usr');u.textContent=user&&!lo&&!pl_?'ユーザー名:'+user:'';u.style.display=pl_?'none':'';   // ゲーム中はユーザー名を出さない
 $('rk').style.display=user&&!lo&&!pl_&&st!='rank'?'inline-block':'none';   // ランキング画面では右上のランキングボタンは出さない
 $('vb').style.display=pl_?'inline-flex':'none';$('app').className=pl_?'play':'';
 for(const id of['md','sv','sc','tgt','lf'])$(id).style.display=pl_&&(id!='tgt'||(q&&(ph=='solve'||ph=='ok'||ph=='miss')))?'inline-block':'none';
 if(!pl_)$('cb').style.display='none';
 if(pl_&&q)$('tgt').textContent=q.target+'をつくれ！'}
function idle(){clearTg();clearLeavers();plan=null;if(cw)endCross();toOn(0);$('ui').classList.remove('wt');$('ui').style.display='none';$('cf').style.display='none';paused=0}
function showLogin(){st='login';idle();setTop();
 ovShow(`<h1>${NAME}</h1><p>ユーザー名を入力してください</p><input id="nm" maxlength="12" placeholder="ユーザー名(12文字まで)" value="${esc(user)}"><div id="nerr" class="err"></div><button class="go big" onclick="doLogin()">ログイン</button>`);
 const i=$('nm');if(i)i.onkeydown=e=>{if(e.key=='Enter')doLogin()}}
function doLogin(){const v=($('nm').value||'').trim().slice(0,12);if(!v){$('nerr').textContent='ユーザー名を入力してください';return}user=v;try{localStorage.setItem('td_user',v)}catch(e){}track('access');showHome()}
function showHome(){st='home';idle();setTop();ovShow(`<h1>${NAME}</h1><button class="go big" onclick="showMenu()">PLAY</button><button class="big" onclick="showHow()">遊び方</button>`)}
function showHow(){st='how';idle();setTop();
 ovShow(`<h2>遊び方</h2><div class="how"><p class="lead">前の車のナンバー(4つの数字)を計算して、答えの数字にしよう。式にカッコはなく、×÷が先に計算されるよ。</p>
 <table class="tb"><tr><th>モード</th><th>数字</th><th>使える記号</th></tr><tr><td>かんたん</td><td>順番どおり(固定)</td><td>＋ −</td></tr><tr><td>ふつう</td><td>並べ替える</td><td>＋ −</td></tr><tr><td>むずかしい</td><td>順番どおり(固定)</td><td>＋ − × ÷</td></tr><tr><td>鬼</td><td>並べ替える</td><td>＋ − × ÷(答えは目標の数字)</td></tr><tr><td>タイムアタック(高速)</td><td>順番どおり(固定)</td><td>＋ −</td></tr></table>
 <ul><li>残機(♥3つ)が減るのは次の2つ。①前の車が曲がったり走り去る前に答えられなかった(時間切れ) ②同じ車で3回まちがえた(ミス3回)</li><li>タイムアタックは60秒で何台解けるか。ミスは−2秒</li><li>金の車は難しいけど高得点! 横断歩道では♡がもらえることも</li><li>空の色と右下の時計で、朝・昼・夕方・夜が変わるよ</li></ul></div><button class="big" onclick="showHome()">もどる</button>`)}
function showMenu(){st='menu';idle();setTop();
 ovShow(`<h2>モードを選ぼう</h2><div class="frame"><div class="ft">一般道路</div><div class="g2">${['easy','normal','hard','oni'].map(k=>`<button onclick="pickMode('${k}')">${MODES[k].n}</button>`).join('')}</div></div>
 <div class="frame"><div class="ft">高速</div><button class="wide" onclick="pickMode('hwy')">タイムアタック</button></div>`)}
function again(m){track('play_'+m);start(m)}   // 「もう一回」もプレイ回数として数える
function pickMode(m){track('play_'+m);showInfo(m)}   // モード選択画面でモードを選んだ回数を数える
function showInfo(m){st='info';mode=m;idle();setTop();const b=bst(m);
 ovShow(`<h2>${lab(m)}</h2><div class="bestbox">BEST<b>${b.s}</b>点 ／ <b>${b.c}</b>台</div>
 <div class="how"><b>このモードのルール</b><ul>${MODES[m].rule.map(r=>`<li>${r}</li>`).join('')}${m=='hwy'?'':'<li>残機−1になるのは「時間切れ」と「同じ車で3回ミス」の2通り</li>'}</ul></div>
 <button class="go big start" onclick="start('${m}')">スタート</button>`)}
let ovHtml='',orankT='';
const setOR=t=>{orankT=t;const e=$('orank');if(e&&st=='over')e.textContent=t};
function showResult(){st='over';idle();setTop();ovShow(ovHtml);const e=$('orank');if(e&&orankT)e.textContent=orankT}   // ランキングから戻ったとき、さっきのリザルト画面をそのまま出す
function over(){
 if(st=='over')return;st='over';const b=bst(mode);if(score>b.s){best[mode]={s:score,c:solved};try{localStorage.setItem('td_best2',JSON.stringify(best))}catch(e){}}
 idle();setTop();orankT='';const nb=bst(mode);
 ovShow(ovHtml=`<h1 class="huge">${mode=='hwy'?'高速を出ました!':'GAME OVER'}</h1><p class="sub">${lab(mode)}</p>
 <div class="scoreb">${score}<small>点</small></div><p>解いた車 <b>${solved}台</b> ／ BEST ${nb.s}点・${nb.c}台</p><p id="orank" class="sub">ランキング: 確認中…</p>
 <div class="lgbox">${log.length?log.map(l=>`<div class="lg"><div class="n"><span class='${l.gold?'gd':''}'><b class='mk ${l.ok?'ok':'ng'}'>${l.ok?'○':'×'}</b> ${l.gold?'★金の車のナンバー':'ナンバー'} ${l.dg}</span>${l.tg!=10?'(目標 '+l.tg+')':''}</div><div class="a">答え ${fmt(l.sol)}＝${l.tg}</div></div>`).join(''):'<div class="lg">問題なし</div>'}</div>
 <button class="go" onclick="again('${mode}')">もう一回</button><button onclick="showMenu()">モード選択</button>
 ${SHOW_SHARE?'<button class="go" onclick="shareX()">𝕏 でシェア</button>':''}`);
 submitScore(mode,score,solved).then(()=>myRank(mode)).then(r=>{rankLine=r?`${r.rank}位/${r.total}人`:'';setOR(r?`ランキング: ${r.rank}位 / ${r.total}人`:'ランキング: スコアがありません')})
  .catch(e=>setOR('ランキングを取得できませんでした('+(e&&e.message||e)+')'))}
function goBack(){if(st=='how'||st=='menu')showHome();else if(st=='info'||st=='over')showMenu();else if(st=='rank'){prev=='how'||prev=='info'||prev=='over'||prev=='menu'?({how:showHow,info:()=>showInfo(mode),over:showResult,menu:showMenu})[prev]():showHome()}
 else if(st=='play'){paused=1;pauseAt=N();$('cf').style.display='flex'}}
function resume(){const d=N()-pauseAt;t0+=d;enter+=d;hwEnd+=d;okT+=d;missT+=d;nextTurn+=d;bendT+=d;if(cw){cw.wt+=d;cw.gt+=d;cw.born+=d}if(plan)plan.t+=d;paused=0;$('cf').style.display='none'}
function quit(){$('cf').style.display='none';showMenu()}
function setView(v){view=v;$('vb0').classList.toggle('on',v=='drive');$('vb1').classList.toggle('on',v=='cabin');$('cab').style.display=v=='cabin'?'block':'none';hood.visible=v=='drive'}
function toggleView(){setView(view=='drive'?'cabin':'drive')}
/* ---------- 式の入力(数字→記号→数字…の順) ---------- */
const need=()=>ex.length%2?'o':'d',perm=()=>MODES[qm].perm;
function addD(i){if(st=='play'&&ph=='solve'&&perm()&&need()=='d'&&!ex.some(e=>e.t=='d'&&e.i===i)){ex.push({t:'d',i});beep(520+ex.length*50,.06,'triangle');render()}}
function addO(v){if(st=='play'&&ph=='solve'&&need()=='o'&&ex.length<7){ex.push({t:'o',v});if(!perm())ex.push({t:'d',i:ex.filter(e=>e.t=='d').length});beep(420,.06,'triangle');render()}}
function back(){if(ph!='solve')return;if(perm())ex.pop();else if(ex.length>1)ex.length-=2;render()}
function clr(){if(ph!='solve')return;ex=perm()?[]:[{t:'d',i:0}];render()}
function render(){
 if(st!='play')return;const hold=ph=='wait'||ph=='cross'||ph=='arrive';$('ui').classList.toggle('wt',hold);$('wts').textContent=ph=='cross'?'横断歩道で止まっているよ':'つぎの車が前に入ってきます';
 if(!q)return;setTop();const M=MODES[qm],go=ph=='solve',full=ex.length==7;
 $('expr').innerHTML=`<span class="eq">${ex.map(e=>e.t=='d'?q.d[e.i]:OPN[e.v]).join(' ')||'&nbsp;'}</span><small>＝ ${q.target}${gold?' ★':''}</small>`;
 $('cap').textContent=(M.perm?'数字を好きな順に押して、間に記号を入れよう':'数字は左から順番に自動で入るよ(押せません)。記号だけ選んでね')+(mode!='hwy'&&wrong?'  ／  ミス '+wrong+'/3':'');
 const tl=$('tiles');tl.style.gridTemplateColumns='repeat(4,1fr)';
 tl.innerHTML=q.d.map((d,i)=>{const u=ex.some(e=>e.t=='d'&&e.i===i);return M.perm?`<button class="tile" ${go&&need()=='d'&&!u?'':'disabled'} onclick="addD(${i})">${d}</button>`:`<div class="tile fix${u?' u':''}"><i>${i+1}</i>${d}</div>`}).join('');
 const os=M.ops.split('');$('ops').style.gridTemplateColumns=`repeat(${os.length},1fr)`;
 $('ops').innerHTML=os.map(o=>`<button class="op o${'+-*/'.indexOf(o)}" ${go&&need()=='o'&&!full?'':'disabled'} onclick="addO('${o}')">${OPN[o]}</button>`).join('');
 const c=$('ctl');c.style.gridTemplateColumns='1fr 1fr 2fr';
 c.innerHTML=`<button class="m" onclick="back()">⌫</button><button class="m" onclick="clr()">クリア</button><button class="go" ${go&&full?'':'disabled'} onclick="submit()">決定</button>`;
 if(hold){$('expr').innerHTML='&nbsp;';$('cap').textContent='ちょっとまってね';tl.innerHTML=[0,1,2,3].map(()=>'<div class="tile fix u">･</div>').join('')}}
addEventListener('keydown',e=>{
 if(st!='play'||paused)return;const k=e.key;if(k=='v'||k=='V')return toggleView();
 if(ph!='solve')return;
 if(/^\d$/.test(k)){const i=q.d.findIndex((d,j)=>d==k&&!ex.some(x=>x.t=='d'&&x.i===j));if(i>=0)addD(i)}
 else if('+-*/'.includes(k)&&MODES[qm].ops.includes(k))addO(k);
 else if(k=='Backspace')back();else if(k=='Enter')submit()});

/* ---------- メインループ ---------- */
function frame(){
 const n=N(),dt=Math.min(.05,n-tm);tm=n;
 if(paused){ren.render(scene,camera);requestAnimationFrame(frame);return}
 const play=st=='play',hwy=play&&mode=='hwy',K=hwy?25:13;
 /* 自車の速さ: 交差点に着く時刻に合わせる。前の車・停止線の手前では、ぶつからないよう減速して止まる */
 let spdB=1,lim=1e9;
 if(play){
  if(ph=='solve'&&slot){const tl=Math.max(.6,t0+T-n);spdB=Math.max(.4,Math.min(2.2,slotDist/tl/13))}
  lim=playerLimit()}
 spdB=Math.min(spdB,lim/K);
 spd+=(spdB-spd)*Math.min(1,dt*1.5);spd=Math.min(spd,lim/K);if(spd<.006&&lim<.15)spd=0;
 const S=K*spd;curS=S;tod=(tod+dt/12)%24;   // 高速は90km/h。時刻は12秒で1時間進む
 if(slot&&ph=='solve')slotDist-=S*dt;
 if(play){
  if(ph=='solve'&&mode!='hwy'&&tg&&tg.set&&(n-t0>=T||(slot&&slotDist<=0)))miss();
  if(ph=='ok'&&n-okT>(hwy?.12:.6))afterOk();
  if(ph=='miss'&&n-missT>2.6){life<=0?over():newCar()}
  if(ph=='wait')newCar();
  if(hwy&&n>=hwEnd)over();
  D+=S*dt;spawnCurve(n);buildCurve();
  if(cw)crossUpdate(n,dt,S);
  if(n>oncT){oncOn=!hwy&&!oncOn;oncT=n+rnd(12,26)}
 }else{curves.length=0;curveEnd=0;D=0;thBase=0;buildCurve();oncOn=0;if(tg||cw||leavers.length)idle()}
 applyDay(dt);
 for(const r of RAMPS){r.z+=S*dt;if(r.z>66&&!npcs.some(c=>!c.dead&&c.ex===r))r.z-=LEN*Math.ceil((r.z-66)/LEN)}   // 出口・分岐へ向かう車がいる間は基準位置を巻き戻さない(車がランプの外へ飛び出すのを防ぐ)
 for(const o of world){o.z+=S*dt;if(o.z>10)o.z-=LEN;o.m.visible=(o.t=='h')==hwy;o.m.position.set(o.x+off(o.z),0,o.z);o.m.rotation.y=curveYaw(o.z);
  if(o.rl){o.rl[0].visible=o.rl[1].visible=true;for(const r of RAMPS){const d=((o.z-r.z+LEN/2)%LEN+LEN)%LEN-LEN/2;if(d<30&&d>-62)o.rl[r.side<0?0:1].visible=false}}}
 /* 同じ向きの車(レーンごとの速さ。車線変更は空いているときだけ) */
 const L_=lanesNow(),tgG=!!(tg&&cw&&cw.lt&&!cw.go),tgIn=!!(tg&&!tgG&&!tg.set);
 for(const c of npcs){
  let rate=1.2,sig=-1;
  if(c.fc){sig=c.fc.to<c.lx?0:1;if(n>=c.fc.t){if(laneSafe(c.fc.to,c)){c.lx=c.fc.to;c.k=laneK(c.fc.to)}c.fc=undefined}}   // 前に車をおくための車線変更(ウインカー→安全なら移る)
  for(const o of npcs)if(o!==c&&c.lv===undefined&&Math.abs(o.x-c.x)<1.5&&o.z<c.z&&c.z-o.z<10&&c.k>o.k)c.k=o.k;
  if(c.lv!==undefined)c.lv=Math.min(c.lvM,c.lv+c.la*dt);
  if(tgIn&&tg.x0!=0&&Math.abs(c.lx)<2&&c.z<-3&&c.z>-90)c.k=Math.min(c.k,-.45);   // 入ってくる場所の自車線の前の車は、まとめて先へ離れる
  if(tgIn&&Math.abs(c.lx-tg.x0)<2){if(c.z<tg.z&&c.z>tg.z-50)c.k=Math.min(c.k,-.4);else if(c.z>=tg.z&&c.z<tg.z+30)c.k=Math.max(c.k,.3)}   // 対象車が追い越して入ってくる間は、前の車は離れ、後ろの車は下がる
  {const vf=Math.max(S,10)*(1-c.k)+(c.lv||0);let lm=1e9;   // 自分の地面に対する速さ。前の車・自車・停止線の手前では、ぶつからないよう減速して止まる
   let hl=1e9;
    for(const o of npcs)if(o!==c&&o.vg!==undefined&&Math.abs(o.x-c.x)<2.3&&o.z<c.z){lm=Math.min(lm,fol(c.z-o.z-4.6,o.vg));
     const g_=c.z-o.z,want=hwy?12+o.vg*.9:10+o.vg*.7;hl=Math.min(hl,Math.max(0,o.vg+.5*(g_-want)))}   // 前の車との車間は、速さに合わせて取る(近いと前の車より遅くして離れ、遠いと少しずつ詰める。連結しない)
    if(hl<1e9)lm=Math.min(lm,c.vg===undefined?hl:Math.max(hl,c.vg-5*dt));   // 急ブレーキにならないよう、なめらかに減速   // 高速は、前の車との車間を速さに合わせて広く取る(近いと少し遅くして離れる)
   if(Math.abs(c.x)<2.3&&c.z>0)lm=Math.min(lm,fol(c.z-4.5,S));
   if(tg&&Math.abs(tg.x-c.x)<2.3&&tg.z<c.z)lm=Math.min(lm,fol(c.z-tg.z-4.6,tgG?tg.vt:S));
   for(const l of leavers){if(Math.abs(l.x-c.x)<2.3&&l.z<c.z)lm=Math.min(lm,fol(c.z-l.z-4.6,l.vf));
    if(l.dir<0&&!l.e.go&&l.e.wt>2&&Math.abs(c.x+3.5)<2.6&&c.z-l.z>=14)lm=Math.min(lm,fol(c.z-l.z-14,0))}   // 左折したい車が少し待ったら、左の車線の車は手前で止まって先に曲がらせる
   if(cw&&!cw.go&&c.x<2.4){const d=c.z-cw.z-6.5;if(d>-1.5)lm=Math.min(lm,stopV(d))}
   if(lm<vf){c.vg=c.vg===undefined||lm<c.vg?lm:Math.min(lm,c.vg+3.5*dt);c.rec=1}
   else if(c.rec){c.vg=Math.min(vf,(c.vg===undefined?vf:c.vg)+3.5*dt);if(c.vg>=vf-1e-6)c.rec=0}
   else c.vg=vf}
  let nz=c.z+(S-c.vg)*dt;
  if(c.lv!==undefined){   // 問題の車だった車: 加速して走り去る。前に車がいたらウインカーを出して車線を変えて避ける
   let ob=null;for(const o of npcs)if(o!==c&&Math.abs(o.x-c.x)<2.2&&o.z<nz+1&&nz-o.z<28&&(!ob||o.z>ob.z))ob=o;
   if(ob){if(c.lcT===undefined){const op=L_.filter(l=>l!==c.lx&&Math.abs(l-c.lx)<4&&laneSafe(l,c,vgOf(c)));if(op.length){c.lcTo=pick(op);c.lcT=n+(c.la>12?.5:1.1)}}
    nz=Math.max(nz,Math.min(c.z,ob.z+9))}
   if(c.lcT!==undefined){sig=c.lcTo<c.lx?0:1;if(n>c.lcT){if(laneSafe(c.lcTo,c,vgOf(c)))c.lx=c.lcTo;c.lcT=undefined}}}
  c.z=nz;
  if(play&&c.lv===undefined){c.t-=dt;
   if(c.ex){const r=c.ex,zl=c.z-r.z;sig=r.side<0?0:1;if(c.lx!==c.exL){   // まずウインカーだけ出し、少し待って安全なら寄る。間に合わなければ出口をあきらめる
    if(n>=c.exT){if(laneSafe(c.exL,c)){c.lx=c.exL;c.k=laneK(c.exL)}else if(zl<40){c.ex=0;c.exT=undefined;sig=-1}else c.exT=n+.4}}
   else if(zl<=24){c.lx=c.x=exX(r,c.exL,zl)}}   // 出口・分岐: ウインカー→ランプの道の中心を走る(横ずれしない)
   else{
    if(hwy)for(const r of RAMPS){const D=c.z-r.z;if(D<140&&D>86&&c.dec!==r.id){if(c.rl_!==r.id){c.rl_=r.id;c.exw=Math.random()<.5}   // 出るかどうかは1回だけ決め、空くのを待つ
   const L=r.side*3.5;if(!c.exw||Math.abs(c.lx-L)>3.6)c.dec=r.id;else if(laneSafe(L,c)){c.dec=r.id;c.ex=r;c.exL=L;c.exT=n+(Math.abs(c.lx-L)>.1?1.6:0);c.home=undefined;break}}}   // 出ると決めたら、約1.6秒ウインカーを出してから寄る
    if(!c.ex){
     if(c.t<0){c.t=rnd(5,12);const i=L_.indexOf(c.lx),op=[L_[i-1],L_[i+1]].filter(x=>x!==undefined&&laneN(x,c)<3),nx=op.length?pick(op):undefined;
      if(nx!==undefined&&!(nx==0&&c.z>-55&&tg)&&!(tgIn&&Math.abs(nx-tg.x0)<2)&&laneSafe(nx,c)){c.home=c.lx;c.lx=nx;c.k=laneK(nx);c.ret=n+rnd(5,8);c.rs=0}}   // 追い越し開始(元の車線を覚える)
     if(c.home!==undefined){   // 追い越したあと、車間を空けてからウインカーを出して元の車線へ戻る
      if(!L_.includes(c.home))c.home=undefined;
      else{const gap=!npcs.some(o=>o!==c&&Math.abs(o.x-c.home)<2&&o.z>c.z&&o.z-c.z<20)&&!(tg&&Math.abs(tg.x-c.home)<2&&tg.z>c.z&&tg.z-c.z<20)&&!(c.home==0&&c.z>-55&&tg);
       if(c.rs==0){if(n>c.ret&&gap){c.rs=1;c.rt=n+2.4}}
       else{sig=c.home<c.lx?0:1;if(n>c.rt){if(gap&&laneSafe(c.home,c)){c.lx=c.home;c.k=laneK(c.home);c.home=undefined;c.rs=0}else if(!gap)c.rs=0;else c.rt=n+.4}}}}
     if(cw&&!cw.go&&!cw.lt&&c.lx==0&&c.z<-3&&c.z>cw.z-8&&clear(-3.5,c.z,c)&&laneN(-3.5,c)<3){c.lx=-3.5;c.k=laneK(-3.5)}   // 回復の横断歩道では、自車の前の車線に車を並ばせない
     if(c.lx==0&&c.z>-48&&tg){if(tgIn)c.k=Math.min(c.k,-.4);else if(clear(-3.5,c.z,c)&&laneN(-3.5,c)<3){c.lx=-3.5;c.k=laneK(-3.5)}else c.k=Math.min(c.k,-.25)}}}}
  c.x+=(c.lx-c.x)*Math.min(1,dt*rate);
  if((c.z>10&&c.k>=0)||c.z>45||(c.z<-150&&!c.ex)||c.z<-210||(c.ex&&c.z-c.ex.z<-196)){
   const wasEx=c.ex,gone=c.z<0;rm(c.g);
   if(npcs.length-npcs.filter(o=>o.dead).length>NPCN()){c.dead=1;continue}
   let lx=pickLane(L_,c),nz2=bestZ(lx,c,110,170),k0=null;
   if(wasEx)nz2=-rnd(125,145);
   else if(gone){const sl=L_.filter(l=>l!==0&&clear(l,22,c));if(sl.length){lx=pickLane(sl,c);nz2=22+rnd(0,8);k0=-rnd(.28,.5)}}   // 追い越していった車は、また後ろから追い越しに来る
   Object.assign(c,mkNpc(nz2,lx));if(k0!==null)c.k=k0;c.ex=0;c.home=undefined;c.dec=0;c.lv=undefined;c.lcT=undefined;sig=-1}
  {const u2=c.g.userData;u2.bl[0].visible=u2.bl[1].visible=false;if(sig>=0&&Math.floor(n*2.6)%2==0)u2.bl[sig].visible=true}
  {let yw=c.ex?(c.lx===c.exL&&c.z-c.ex.z<=24?-c.ex.side*Math.atan(Math.abs(exX(c.ex,c.exL,c.z-c.ex.z-1)-exX(c.ex,c.exL,c.z-c.ex.z))):Math.max(-.35,Math.min(.35,(c.x-c.lx)*.1))):(c.x-c.lx)*.06;
   c.yw=c.ex?(c.yw||0)+(yw-(c.yw||0))*Math.min(1,dt*10):0;if(c.ex)yw=c.yw;   // 出口の車は、向きを急に変えない
   place(c.g,c.x,c.z,yw)}}
 npcs=npcs.filter(c=>!c.dead);
 if(play&&oncOn&&!cw&&!lt&&!(slot&&dir>0)&&n>nextOnc&&onc.length<6){   // 右に曲がる車がいる間は対向車を出さない
  const x=Math.random()<.5?3.5:7;if(!onc.some(o=>o.x==x&&o.z<-150))onc.push({g:rcar(),x,z:-175,v:rnd(11,16)});nextOnc=n+rnd(1.2,3.5)}
 for(let i=onc.length-1;i>=0;i--){const o=onc[i];let lm=1e9;   // 対向車: 前の車の後ろ・停止線で止まり、人がいなくなって青になったら進む
  for(const q_ of onc)if(q_!==o&&q_.x===o.x&&q_.z>o.z)lm=Math.min(lm,fol(q_.z-o.z-4.6,q_.vg===undefined?q_.v:q_.vg));
  if(cw&&!cw.go){const d=cw.z-o.z-6.5;if(d>-1.5)lm=Math.min(lm,stopV(d))}
  if(lm<o.v){o.vg=o.vg===undefined||lm<o.vg?lm:Math.min(lm,o.vg+3.5*dt);o.rec=1}
  else if(o.rec){o.vg=Math.min(o.v,o.vg+3.5*dt);if(o.vg>=o.v-1e-6)o.rec=0}
  else o.vg=o.v;
  o.z+=(S+o.vg)*dt;if(o.z>12){rm(o.g);onc.splice(i,1);continue}
  place(o.g,o.x,o.z,Math.PI)}
 /* 対象の車 */
 if(tg&&!tg.set&&tg.age>(tg.vis?20:6))newCar();   // 隣の車線が渋滞などで入れないときは作り直す(まだ見えていなければ気づかれない)
  if(tg){
  const p=getP(),u=tg.g.userData,zp=tg.z,zpx=tg.x,x0=tg.x0,tanH=.6009*camera.aspect;let steer=0,want=0,bs=0,held=0;
  if(tgG){   // 信号待ち: 横断歩道の手前の停止線で止まる(前に車がいればその後ろ)
   let lm=stopV(tg.z-cw.z-7.5);
   for(const c of npcs)if(!c.dead&&c.vg!==undefined&&Math.abs(c.x-tg.x)<2.3&&c.z<tg.z)lm=Math.min(lm,fol(tg.z-c.z-4.6,c.vg));
   tg.vt=Math.min(12,lm);tg.z+=(S-tg.vt)*dt;tg.x=0;tg.yaw=0}
  else{
   if(!tg.set){tg.age+=dt;t0=n+1}   // 前に入り終わるまで制限時間は進まない
   const zT=-Math.max(11,4.6/tanH+1);   // 隣の車線の車が画面に見えてから車線変更に入る位置
   if(tg.m==0){   // 隣の車線を後ろから追い越してくる(車線変更はまだしない)
    const d=tg.z-zT,vz=d>0?-Math.min(hwy?22:15,Math.max(3,d*2)):0;
    tg.z=Math.max(zT,tg.z+vz*dt);
    if(tg.z<zT+14&&tg.z<-4)tg.bt+=dt;else tg.bt=0;   // 近づいたら先にウインカー
    if((tg.z<=zT+.3||(tg.age>3&&tg.z<=-6.8))&&tg.bt>=1.1&&mergeOK())tg.m=1}
   if(tg.m==1){   // ウインカーを出したまま、ゆっくり自車の車線へ
    const u_=1-Math.abs(tg.x)/Math.abs(x0),LR=Math.max(2.6,3.5/(.24*Te)),spx=LR*(.3+.7*Math.sin(Math.PI*Math.min(1,Math.max(0,u_)))),dx=-tg.x;
    tg.x=Math.abs(dx)<=spx*dt?0:tg.x+Math.sign(dx)*spx*dt;
    tg.z+=Math.max(-7*dt,Math.min(7*dt,-9-tg.z));
    if(tg.x==0){tg.m=2;tg.set=1}}
   else if(tg.m==2){tg.x=0;tg.z+=Math.max(-8*dt,Math.min(8*dt,-(9+6*p)-tg.z))}
   if(tg.m==0||tg.m==1){want=tg.m==1||tg.bt>0?1:0;bs=x0<0?1:0}
   else if(slot&&t0+T-n<=3){want=1;bs=dir<0?0:1}}   // 曲がる約3秒前からウインカー
  if(!tgG)for(const c of npcs){if(c.dead||(Math.abs(c.x-tg.x)>=2.3&&(tg.m==2||Math.abs(c.x-x0)>=2.3)))continue;   // 前の車の中や後ろの車に突っ込まない
   if(c.z<zp+.5&&tg.z<c.z+7){tg.z=c.z+7;held=1}}
  if(!tgG&&tg.z<zp-24*dt)tg.z=zp-24*dt;
  if(!tgG&&tg.m>=1)tg.z=Math.min(tg.z,-6.8);   // 自車のすぐ後ろ・真横まで押し戻されない(前の車が近すぎるときは前の車のほうが先に離れる)
  {const vx=(tg.x-zpx)/Math.max(dt,.001);let ty=0;   // 向きは「実際に横へ動いている分」だけ
   if(!tgG&&!tg.set)ty=Math.max(-.3,Math.min(.3,-Math.atan(vx/Math.max(S,8))));
   tg.ys=(tg.ys||0)+(ty-(tg.ys||0))*Math.min(1,dt*10);tg.yaw=Math.abs(tg.ys)<.004?0:tg.ys;steer=tg.yaw*1.2}
  place(tg.g,tg.x,tg.z,tg.yaw);u.fw.forEach(w=>w.rotation.y=steer);
  if(!tg.vis&&(tg.set||(tg.z<-3.5&&Math.abs(tg.x)<-tg.z*tanH*.92))){tg.vis=1;if(ph=='arrive'){ph='solve';enter=n;render()}}   // 車が画面に見えたら問題を出す
  if(tg.set&&!tg.sd){tg.sd=1;settleTg(n)}
  const blk=Math.floor(n*2.6)%2==0;if(want){if(blk!=lastBlk){lastBlk=blk;tick(blk)}}else lastBlk=-1;
  u.bl[0].visible=u.bl[1].visible=false;if(want&&blk)u.bl[bs].visible=true;
  if(u.gm){const k=gold?1.2:1;u.gm[0].opacity=(.45+.2*Math.sin(n*6))*k;u.gm[1].opacity=(.2+.1*Math.sin(n*6))*k;if(u.gm[2])u.gm[2].opacity=(.12+.12*Math.sin(n*5))*k}
  if(u.sparks)animSparks(u.sparks,u.top,n)}
 updLeavers(dt,S,n);separate();
 camera.position.y+=((view=='drive'?1.3:1.1)-camera.position.y)*Math.min(1,dt*6);camera.rotation.z=-bend*.03;camera.rotation.x=-.02;
 if(view=='cabin'){$('whg').setAttribute('transform','rotate('+(bend*70)+')');$('kmh').textContent=Math.round(S*3.6)+' km/h'}
 ren.render(scene,camera);
 if(play){const hw=mode=='hwy';
  setT('md',MODES[mode].n);setT('sv',solved+'台');setT('sc','SCORE '+score);setT('cb',combo>1?combo+' COMBO':'');$('cb').style.display=combo>1?'inline-block':'none';
  setT('lf',hw?'残り'+Math.max(0,Math.ceil(hwEnd-n))+'秒':'♥'.repeat(Math.max(0,life))+'♡'.repeat(Math.max(0,3-life)))}
 const hh=Math.floor(tod),mm=Math.floor((tod-hh)*60/10)*10,cs=`${hh<5||hh>=19?'🌙 夜':hh<9?'🌅 朝':hh<16?'☀ 昼':'🌇 夕方'}  ${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}  ${WX[wx].n}`;
 if(cs!=clkS){clkS=cs;$('clk').textContent=cs}
 requestAnimationFrame(frame)}
rollSky();showLogin();frame();   // 起動時は毎回ログイン画面(前回の名前が入力欄に残っています)

/* ---------- 拡大の禁止(Safari/Chrome) ---------- */
['gesturestart','gesturechange','gestureend'].forEach(t=>document.addEventListener(t,e=>e.preventDefault(),{passive:false}));   // iPhone Safari: ピンチ拡大
document.addEventListener('touchmove',e=>{if(e.touches.length>1)e.preventDefault()},{passive:false});   // 2本指の操作(Chrome・Safari)
let lastTE=0;   // 押せないボタン(記号を押し切ったあと等)や何もない所のダブルタップ拡大を止める。押せるボタンの連打は止めない
document.addEventListener('touchend',e=>{const t=Date.now(),el=e.target,b=el&&el.closest?el.closest('button'):null;
 if(t-lastTE<400&&(!b||b.disabled)&&!/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName||''))e.preventDefault();lastTE=t},{passive:false});
document.addEventListener('dblclick',e=>e.preventDefault());
