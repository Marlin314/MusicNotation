// musicTest.js - test function

TG.prototype.spew = function(){
  var t = this.root, res = 'TG: ' + t.val, sep = ', ';
  while(t.next != null){res += sep + t.next.val; t = t.next;}
  return res;
}
TG.prototype.addSpew = function(val){
  var res = this.spew() + " then we added " + val ;
  res += '(' + this.get(val).val + ')';
  return res + " and we got " + this.spew();
}

TG.prototype.uniformSpace = function(dx){
  var t = this.root; t.db = dx;
  while(t.next != null){t.next.db = dx; t = t.next;}
}

var TestCNDX;
var TestCSTR;
function TestCharIteration(){var res = (TestCNDX < TestCSTR.length)? TestCSTR.charAt(TestCNDX++) : 'EOF';
  return res;
}
 
VM.prototype.parseAndSpewNum = function(str){
  this.init();
  TestCNDX = 0; 
  TestCSTR = str; 
  parseRN(this, TestCharIteration);
  return this.num.val;
} 

Reg.prototype.spewIntState = function(){return '<br>'+this.name+': '+ ((this.isNull)? '<i>'+this.val+'</i>':'<b>'+this.val+'</b>');}

VM.prototype.spewState = function(){
  var res = '<h3>VM state</h3>';
  res += '<br/>history: ' + this.history;
  res += '<br/>inNum: ' + (this.inNum ? 'true':'false');
  res += '<br/>time: ' + this.time;
  res += this.num.spewIntState();
  res += this.num2.spewIntState();
  res += this.y.spewIntState();
  res += this.dir.spewIntState();
  res += this.oShift.spewIntState();
  res += this.nTic.spewIntState();
  res += this.nFlag.spewIntState();
  res += this.nDot.spewIntState();
  res += this.rest.spewIntState();
  res += '<br/>hp: ' + this.hp + ' - fp: ' + this.fp;
  res += '<br/>' + this.spewStems();
  res += '<br/>nBGs: ' + this.bgs.length + ' curBG_shape: ' + (this.bg.isNull ? 'null': this.bg.val.spewShape() ) ;
  res += '<br/>time: ' + this.time;
  res += '<br/>'+this.timeGroup.spew();
  return res;
}

VM.prototype.spewStems = function(){
  var res = 'Stems: '; 
  for(var i = 0; i<this.stems.length; i++){res += this.stems[i].spewStem(i, this) + ' | '; }
  if(this.hp == this.stems.length){res += '<b> hp</b>';}
  if(this.fp == this.stems.length){res += '<b> fp</b>';}
  return res;
}

BG.prototype.spewShape = function(){
  var res = ''; 
  for(var i = 0; i<this.beams.length; i++){res += '['+this.beams[i][0]+', '+this.beams[i][1]+', '+this.beams[i][2]+']';}
  return res;
}

Stem.prototype.spewStem = function(i, vm){
  if(this.isRest){return 'R';}
  var res = 'h:'+this.heads.length;
  res += (this.nDot == 0)? '' : '.'+this.nDot;
  if(i == vm.hp){res += '<b> hp</b>';}
  if(i == vm.fp){res += '<b> fp</b>';}
  return res;
}
