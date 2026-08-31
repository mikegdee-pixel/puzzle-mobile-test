console.info("PuzzleNook build 101.4.1");
/* GitHub Pages static-data adapter: read-only replacement for the local Node gameplay API. */
(() => {
  const nativeFetch=window.fetch.bind(window);
  let puzzleDbPromise=null,ellWordsPromise=null,trailWordsPromise=null;

  const rel=path=>new URL(path,document.baseURI).toString();
  const jsonResponse=(data,status=200)=>new Response(JSON.stringify(data),{
    status,headers:{"Content-Type":"application/json"}
  });

  async function loadDb(){
    if(!puzzleDbPromise){
      puzzleDbPromise=nativeFetch(rel("data/puzzles.json"),{cache:"no-store"})
        .then(r=>{if(!r.ok)throw new Error("Could not load puzzle data.");return r.json();});
    }
    return puzzleDbPromise;
  }
  async function loadSet(file,kind){
    if(kind==="ell"){
      if(!ellWordsPromise)ellWordsPromise=nativeFetch(rel(file)).then(r=>r.json()).then(a=>new Set(a.map(w=>String(w).toUpperCase())));
      return ellWordsPromise;
    }
    if(!trailWordsPromise)trailWordsPromise=nativeFetch(rel(file)).then(r=>r.json()).then(a=>new Set(a.map(w=>String(w).toUpperCase())));
    return trailWordsPromise;
  }
  const flatten=p=>({id:p.id,game:p.game,date:p.date,...(p.data||{})});

  async function ellPossible(letters){
    const set=await loadSet("data/every-last-letter-guesses.json","ell");
    const available={};
    for(const ch of letters)available[ch]=(available[ch]||0)+1;
    for(const word of set){
      if(word.length<3||word.length>letters.length)continue;
      const needed={};let ok=true;
      for(const ch of word){
        needed[ch]=(needed[ch]||0)+1;
        if(needed[ch]>(available[ch]||0)){ok=false;break;}
      }
      if(ok)return word;
    }
    return null;
  }

  window.fetch=async function(input,init){
    const raw=typeof input==="string"?input:input?.url;
    if(!raw)return nativeFetch(input,init);

    // Convert old root-level static references so repository sub-path hosting works.
    if(raw.startsWith("/data/"))return nativeFetch(rel(raw.slice(1)),init);
    if(raw.startsWith("/public/"))return nativeFetch(rel(raw.slice("/public/".length)),init);
    if(!raw.startsWith("/api/"))return nativeFetch(input,init);

    const u=new URL(raw,"https://static.local");
    try{
      if(u.pathname==="/api/puzzle/today"){
        const db=await loadDb(),game=u.searchParams.get("game"),date=u.searchParams.get("date");
        const p=(db.puzzles||[]).find(x=>x.game===game&&x.date===date);
        return p?jsonResponse(flatten(p)):jsonResponse({error:"No scheduled puzzle"},404);
      }
      if(u.pathname==="/api/puzzle/archive-random"){
        const db=await loadDb(),game=u.searchParams.get("game"),before=u.searchParams.get("before");
        const excluded=new Set(String(u.searchParams.get("exclude")||"").split(",").map(Number).filter(Number.isFinite));
        const eligible=(db.puzzles||[]).filter(x=>x.game===game&&x.date&&(!before||x.date<before)&&!excluded.has(Number(x.id)));
        if(!eligible.length)return jsonResponse({error:"No unseen archive puzzle available"},404);
        return jsonResponse(flatten(eligible[Math.floor(Math.random()*eligible.length)]));
      }
      if(u.pathname==="/api/wordtrail/validate"){
        const word=String(u.searchParams.get("word")||"").trim().toUpperCase();
        if(!/^[A-Z]+$/.test(word)||word.length<4)return jsonResponse({word,valid:false,reason:"minimum_length"});
        const set=await loadSet("data/wordtrail-guesses.json","trail"),valid=set.has(word);
        return jsonResponse({word,valid,reason:valid?null:"not_in_dictionary"});
      }
      if(u.pathname==="/api/ell/validate"){
        const word=String(u.searchParams.get("word")||"").trim().toUpperCase();
        if(!/^[A-Z]+$/.test(word)||word.length<3)return jsonResponse({word,valid:false,reason:"minimum_length"});
        const set=await loadSet("data/every-last-letter-guesses.json","ell"),valid=set.has(word);
        return jsonResponse({word,valid,reason:valid?null:"not_in_dictionary"});
      }
      if(u.pathname==="/api/ell/can-form-word"){
        const letters=String(u.searchParams.get("letters")||"").trim().toUpperCase();
        if(!/^[A-Z]*$/.test(letters))return jsonResponse({error:"Invalid letters"},400);
        const example=await ellPossible(letters);
        return jsonResponse({possible:!!example,example});
      }
      return jsonResponse({error:"Unsupported static test API route"},404);
    }catch(err){
      console.error("Static adapter:",err);
      return jsonResponse({error:err?.message||String(err)},500);
    }
  };
})();