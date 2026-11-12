"use client";
import {useEffect,useRef,useState,type ReactNode} from "react";
import {ArrowDownToLine,ArrowLeft,BookOpen,ExternalLink,FileText,LoaderCircle} from "lucide-react";
import {apiOrigin} from "@/lib/api";
import "./material-reader.css";

export type ReadingAsset={id:string;title:string;kind:string;original_name:string;size_bytes:number;content_type:string};
function secureLink(value:string){try{const url=new URL(value);return url.protocol==="https:"?url.href:undefined;}catch{return undefined;}}
function inline(value:string):ReactNode[]{
  return value.split(/(\[[^\]]+\]\(https:\/\/[^\s)]+\)|\*\*[^*]+\*\*|https:\/\/[^\s|<>]+)/g).map((part,i)=>{
    const markdown=part.match(/^\[([^\]]+)\]\((https:\/\/[^\s)]+)\)$/);
    if(markdown){const href=secureLink(markdown[2]);return href?<a key={i} href={href} target="_blank" rel="noopener noreferrer">{markdown[1]}<ExternalLink size={12}/></a>:part;}
    if(part.startsWith("**")&&part.endsWith("**"))return <strong key={i}>{part.slice(2,-2)}</strong>;
    if(part.startsWith("https://")){const href=secureLink(part);if(href)return <a key={i} href={href} target="_blank" rel="noopener noreferrer">{new URL(href).hostname}<ExternalLink size={12}/></a>;}
    return part;
  });
}
function RichText({text}:{text:string}){
 const lines=text.split(/\r?\n/),blocks:ReactNode[]=[];
 for(let i=0;i<lines.length;i++){
  const line=lines[i].trim();if(!line)continue;
  if(line.startsWith("|")&&/^\|?[\s:|-]+\|$/.test(lines[i+1]?.trim()||"")){
   const headers=line.split("|").slice(1,-1).map(x=>x.trim());const rows:string[][]=[];i+=2;
   while(i<lines.length&&lines[i].trim().startsWith("|")){rows.push(lines[i].split("|").slice(1,-1).map(x=>x.trim()));i++;}i--;
   blocks.push(<div className="reading-resources" key={`table-${i}`}>{rows.map((row,j)=><article className="reading-resource" key={j}><span className="reading-resource-icon"><BookOpen size={21}/></span><div>{row.map((cell,k)=><div key={k} className={k===0?"resource-title":"resource-detail"}>{k>0&&<span>{headers[k]} · </span>}{inline(cell)}</div>)}</div></article>)}</div>);continue;
  }
  const heading=line.match(/^(#{1,3}) (.+)$/);
  if(heading){blocks.push(<h2 id={`reading-section-${i}`} key={i} className={heading[1].length===1?"reading-intro-title":""}>{inline(heading[2])}</h2>);continue;}
  if(/^[-*] /.test(line)||/^\d+\. /.test(line)){blocks.push(<div className="reading-list-item" key={i}><span>•</span><div>{inline(line.replace(/^([-*]|\d+\.) /,""))}</div></div>);continue;}
  blocks.push(<p key={i}>{inline(line)}</p>);
 }
 return <>{blocks}</>;
}

export function MaterialReader({asset,courseName,onClose,onDownload}:{asset:ReadingAsset;courseName?:string;onClose:()=>void;onDownload:()=>void}){
 const [text,setText]=useState("");const [url,setUrl]=useState("");const [error,setError]=useState("");const [loading,setLoading]=useState(true);const close=useRef<HTMLButtonElement>(null);const dialog=useRef<HTMLElement>(null);
 const isText=/\.(txt|csv|md)$/i.test(asset.original_name);const isPdf=asset.content_type==="application/pdf";const isImage=/^image\/(png|jpeg|webp)$/.test(asset.content_type);
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null;const overflow=document.body.style.overflow;document.body.style.overflow="hidden";close.current?.focus();
  function key(event:KeyboardEvent){if(event.key==="Escape")onClose();if(event.key==="Tab"){const nodes=dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],iframe,video,audio');if(!nodes?.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}}
  document.addEventListener("keydown",key);return()=>{document.body.style.overflow=overflow;document.removeEventListener("keydown",key);previous?.focus();};
 },[onClose]);
 useEffect(()=>{
  const controller=new AbortController();let objectUrl="";
  async function load(){setLoading(true);setError("");try{
   if(asset.kind==="video"||asset.kind==="audio"){setUrl(`${apiOrigin}/api/v1/content/${asset.id}/file?inline=true`);return;}
   if(!isText&&!isPdf&&!isImage)return;
   if(asset.size_bytes>(isText?2:30)*1024*1024)throw new Error("Este arquivo é grande para leitura no navegador. Use a opção Baixar material.");
   const response=await fetch(`${apiOrigin}/api/v1/content/${asset.id}/file`,{credentials:"include",signal:controller.signal});
   if(!response.ok)throw new Error("Não foi possível abrir o material. Verifique seu acesso e tente novamente.");
   if(isText){const content=await response.text();if(!controller.signal.aborted)setText(content);}
   else{objectUrl=URL.createObjectURL(await response.blob());if(!controller.signal.aborted)setUrl(objectUrl);}
  }catch(e){if(!controller.signal.aborted)setError((e as Error).message);}finally{if(!controller.signal.aborted)setLoading(false);}}
  void load();return()=>{controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[asset.id,asset.kind,asset.size_bytes,isText,isPdf,isImage]);
 const headings=text.split(/\r?\n/).map((line,i)=>({title:line.match(/^## (.+)$/)?.[1],i})).filter(item=>item.title);
 return <div className="reading-overlay"><section ref={dialog} className="reading-screen" role="dialog" aria-modal="true" aria-labelledby="reading-title">
  <header className="reading-top"><button ref={close} className="reading-back" onClick={onClose}><ArrowLeft size={18}/>Voltar à biblioteca</button><span><BookOpen size={19}/> KAIRÓS <small>BIBLIOTECA DIGITAL</small></span><button className="button gold" onClick={onDownload}><ArrowDownToLine size={16}/>Baixar material</button></header>
  <div className="reading-hero"><span className="reading-eyebrow">CONHECIMENTO PARA A SUA JORNADA</span><h1 id="reading-title">{asset.title}</h1><p>{courseName||"Material de estudo do Instituto Teológico Kairós"}</p><div className="reading-chips"><span><FileText size={14}/>{isText?"Guia de leitura":isPdf?"Documento PDF":asset.kind==="video"?"Videoaula":asset.kind==="audio"?"Áudio":"Material complementar"}</span><span>{(asset.size_bytes/1024).toLocaleString("pt-BR",{maximumFractionDigits:0})} KB</span></div></div>
  <div className="reading-layout"><aside className="reading-sidebar"><span className="reading-eyebrow">NESTE MATERIAL</span>{headings.length?<nav aria-label="Sumário do material">{headings.map(item=><a key={item.i} href={`#reading-section-${item.i}`}>{item.title}</a>)}</nav>:<p>Seu espaço para ler, explorar e aprofundar.</p>}<div className="reading-tip"><BookOpen size={25}/><h3>Estude com propósito</h3><p>Anote suas dúvidas e leve-as ao professor. As referências externas abrem em uma nova aba.</p></div></aside>
  <article className="reading-paper">{loading?<div className="reading-state" role="status"><LoaderCircle className="reading-spinner"/>Preparando sua leitura…</div>:error?<div className="reading-state" role="alert"><FileText/><p>{error}</p><button className="button navy" onClick={onDownload}>Baixar material</button></div>:isText?<RichText text={text}/>:isPdf&&url?<iframe className="reading-pdf" src={url} title={asset.title}/>:isImage&&url?<img className="reading-image" src={url} alt={asset.title}/>:asset.kind==="video"?<video className="private-video" controls crossOrigin="use-credentials" src={url}/>:asset.kind==="audio"?<audio className="private-video" controls crossOrigin="use-credentials" src={url}/>:<div className="reading-state"><FileText size={36}/><h2>Material disponível para download</h2><p>Abra este formato no aplicativo de sua preferência.</p><button className="button navy" onClick={onDownload}>Baixar material</button></div>}<footer className="reading-footer">INSTITUTO TEOLÓGICO KAIRÓS · Formação Bíblica, Teológica e Ministerial</footer></article></div>
 </section></div>;
}
