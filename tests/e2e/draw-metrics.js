// 検証専用。RAF呼出回数と実際のWebGL描画を区別して記録する。
function installDrawMetrics() {
 const contexts=new Map();let frame=0;let sequence=0;
 const raf=window.requestAnimationFrame.bind(window);
 window.requestAnimationFrame=callback=>raf(time=>{frame=time;callback(time);});
 const proto=WebGLRenderingContext.prototype;
 for(const method of ['drawArrays','drawElements']){
  const original=proto[method];proto[method]=function(...args){
   let record=contexts.get(this.canvas);
   if(!record){record={id:++sequence,canvas:this.canvas,frames:[],calls:[]};contexts.set(this.canvas,record);}
   const start=performance.now();const value=original.apply(this,args);
   if(record.lastFrame!==frame){record.frames.push(start);record.lastFrame=frame;}
   record.calls.push({at:start,cpu:performance.now()-start});return value;
  };
 }
 const percentile=(values,p)=>{if(!values.length)return null;const a=[...values].sort((a,b)=>a-b);return a[Math.min(a.length-1,Math.floor(a.length*p))];};
 window.__odDrawMetrics={sample(start,end){return [...contexts.values()].filter(r=>r.canvas.isConnected).map(r=>{
  const frames=r.frames.filter(t=>t>=start&&t<=end);const intervals=frames.slice(1).map((t,i)=>t-frames[i]);
  const calls=r.calls.filter(c=>c.at>=start&&c.at<=end);
  const gl=r.canvas.getContext('webgl'),debug=gl?.getExtension('WEBGL_debug_renderer_info');
  return {id:r.id,frames:frames.length,drawFps:frames.length*1000/(end-start),intervalMedian:percentile(intervals,.5),intervalP95:percentile(intervals,.95),drawCalls:calls.length,cpuSubmissionMedian:percentile(calls.map(c=>c.cpu),.5),width:r.canvas.width,height:r.canvas.height,renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):'unavailable'};
 });}};
}
module.exports={installDrawMetrics};
