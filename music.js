// music.js

function Time(val){this.val = val; this.prev = null; this.next = null; this.db = 0; this.da = 0} // x set by layout code
Time.prototype.x = function(){
  if(this.val == 0){
    return this.db;
  } else {
    return this.db + this.prev.da + this.prev.x();
  }
}
/*
Time.prototype.accidXtra = function(gap, n){ // add enough to db to account for n cols of accids
  this.setDB(gap*(W_HEAD + W_MARGIN + W_ACCID*n) );
}
*/
Time.prototype.setDefaultWidth = function(gap){this.setDB(gap*W_HM); this.setDA(gap*W_HM);}
Time.prototype.setDB = function(dx){if(dx > this.db){this.db = dx;}}
Time.prototype.setDA = function(dx){if(dx > this.da){this.da = dx;}}

var W_HEAD = 1.5, W_MARGIN = 0, W_ACCID = 3; // widths of half head, default head space, and accid in gap units 
var W_HM = W_HEAD + W_MARGIN, W_HMA = W_HM + W_ACCID;
  
function TG(){this.root = new Time(0);}
TG.prototype.get = function(start){ // return (creating if necessary) the time having the val of start
  if(start == 0){return this.root;} // code below searches for match AFTER the root!
  var t = this.root; // always valid because we always have time0 in a measure
  while(t.next != null && t.next.val < start){t = t.next;}
  if(t.next != null && t.next.val == start){return t.next;} // found it already defined
  var nt = new Time(start);
  nt.prev = t; nt.next = t.next;
  if(t.next != null){t.next.prev = nt;}
  t.next = nt;
  return nt;
}

var QUARTER_NOTE_DUR = 256*9*5*7*11*13; // allows 8 flags, double triplets, and other strange lo prime tuplets.
var POW2 = [1,2,4,8,16,32,64,128,256,512,1024];

function SvgStr(){this.str = ''}
SvgStr.prototype.BLACK = ' style="stroke:black"/>'; // note: close of svg elt included
SvgStr.prototype.BFILL = ' style="stroke:black;fill:black"/>';
SvgStr.prototype.HFILL = ' style="stroke:black;fill-opacity:0.0"/>'; // what a bag, no fill is not default you must use alpha!
SvgStr.prototype.line = function(x1,y1,x2,y2){this.str += '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'"'+this.BLACK;}
SvgStr.prototype.fE = function(cx,cy,rx,ry){this.str += '<ellipse cx="'+cx+'" cy="'+cy+'" rx="'+rx+'" ry="'+ry+'"'+this.BFILL;}
SvgStr.prototype.hE = function(cx,cy,rx,ry){this.str += '<ellipse cx="'+cx+'" cy="'+cy+'" rx="'+rx+'" ry="'+ry+'"'+this.HFILL;}
SvgStr.prototype.beam = function(gap,x1,y1,x2,y2){ // gap is thickness
  this.str += '<polygon points="' + x1 + ',' + y1 + ' ' + x2 + ',' + y2 + ' ' +
    x2 + ',' + (y2 + gap) + ' ' + x1 + ',' + (y1 + gap) + '" fill="black" />'
}
SvgStr.prototype.flagRest = function(nFlag, x, y, gap){
  this.line(x+gap, y-5*gap/3, x-gap, y+7*gap/3); // moslty vertical line
  for(var i = 0; i<nFlag; i++){var yy = y-5*gap/3 + i*2*gap/3; this.line(x+gap, yy, x-gap, yy);} // the flags
}
SvgStr.prototype.qRest = function(gap,x,y){this.beam(gap, x-gap/2, y+2*gap, x+gap/2, y-2*gap);} // stub
SvgStr.prototype.sharp = function(gap,x,y){
  var ix = 0.8*gap, ox =1.5*gap, dy = 0.5*gap, ds = .5*gap;
  this.line(x - ix, y - 3*gap + dy, x - ix, y + 3*gap); // two vertical lines
  this.line(x + ix, y - 3*gap, x + ix, y + 3*gap - dy);
  this.line(x - ox, y - gap + ds, x + ox, y - gap - ds); // two nearly horizontal
  this.line(x - ox, y + gap + ds, x + ox, y + gap - ds);
}
SvgStr.prototype.doubleSharp = function(gap,x,y){
  this.line(x - gap, y - gap, x + gap, y + gap);
  this.line(x - gap, y + gap, x + gap, y - gap);
}

SvgStr.prototype.natural = function(gap,x,y){
  var ix = 0.8*gap, dy = 0.5*gap, ds = .5*gap;
  this.line(x - ix, y - 3*gap + dy, x - ix, y + gap + ds); // two vertical lines
  this.line(x + ix, y - gap - ds, x + ix, y + 3*gap - dy);
  this.line(x - ix, y - gap + ds, x + ix, y - gap - ds); // two nearly horizontal
  this.line(x - ix, y + gap + ds, x + ix, y + gap - ds);
}

SvgStr.prototype.flat = function(gap,x,y){
  var ix = 0.8*gap, dy = 0.5*gap, ds = .5*gap;
  this.line(x - ix, y - 3*gap + dy, x - ix, y + gap + ds); // vertical line
  this.line(x - ix, y - gap + ds, x + ix, y + gap - ds); 
  this.line(x - ix, y + gap + ds, x + ix, y + gap - ds);
}

SvgStr.prototype.doubleFlat = function(gap,x,y){
  var dx = .5*gap;
  this.flat(gap,x + dx,y); this.flat(gap,x-dx,y);
}


/* Outline of classes - we have lots of music elements most of which will be come classes. Lets start with a list

  Musical data ultimately comes from some web database. It will contain information to allow searching for the chunk of music that
  you are interested in and will eventually give you a bunch of Alts, which are just little strings written in little languages
  each of which represents effectively one measure worth of information of a particular type. There will be a little language for
  each different type of data. Typical data types would be, Rhythm, Notes, Lyrics, Fingerings, Tab, BowMarks - the first two being
  fairly generic and the others being instrument specific. Also it is expected that there will not be much variance in the first 
  two (Rhythm and Notes), those will be the notes written by Bach, or Mozart, but the others will exist in multiple copies. You
  could easily have Bernstein's Bow Marks, and Bob's Bow Marks, and Sally's GuitarTab, and Ruth's Fingerings. We capture that 
  variation with Alts. So here is the basic organizational hierarchy:
  
  Composer - Work - Movement - Section - Measure - Part - Track - Alt
  
  Movement - defines the Parts and instrumentation - think Act2Scene3 of Don Giovani which is a Duet.
  Section - captures repetition. It is just a block of consecutive measures.
    the layout of those sections, either AABBAA or AABB-DelCapo or |:A:|:B:|-DelCapo would be kept in the Movement
  Slice - One measure, but it is a measure that contains all the parts of a piece. It is the smallest vertical slice of a Section.
    The kids of a Slice are all horizontal elements, Parts, Tracks, Alts. I did not call this a Measure because I want the word
    Measure to be a View component, not a model component. A Measure will essentially be a View of a Slice, it will define the layout.
  Part - what is performed by one instrument, but will inself be composed of multiple horizontal tracks.
  Track - for example Paino would have RH_Rhythm, RH_Pitch, LH_Rhythm, Fingerings etc. - Vn2 might be Rhythm, Pitch, BowMarks
  Alt - this is not a musical term. I introduce it to contain variants of Fingerings, BowMarks, GuitarTab etc.
    There will be only one Track, Fingerings, but each different editor can have his/her own Alternatives. Alts will
    necessarily need something on the Web end so that you can get the ones that you are interested in but at the low
    level, the Alt is just the actual string in the little language that we need.
    
    I may possibly need some alternatives at the Part level (like if you want to play the first violin on an oboe, you
    want oboe fingerings, not violin ones) but I won't worry about that now.
 
  There is a regularity in the above structure and I have named members to reflect that regularity. The three fields are
  da (for dad, ie the parent, so a movement has a work as a da, a section has a movement as a da ...)
  kids (a movement has many sections, a Section many measures, those are the kids...)
  ndx (index of birth order i.e. for any element this.da.kids[ndx] == this )
 
  Yes, I could have given each class individual names. A movement has sections, a section belongs to a single movement ...
  perhaps I will regret this choice someday. It does mean that you could have something ugly like Alt foo; foo.da.da.da to
  back up to the Slice rather than foo.track.part.slice. But seriously, I don't think the code will be nested that deep.
  
  The classes that I have just listed are essentially high level, describing the music. It is what we get from the Web. It is
  the Model. At the lower level most of the classes are View classes. I could slavlishly append the word "View" on my viewer
  classes, but mostly there is no need. All the little things like, Stems, Rests, Heads, Dots, Beams, Flags, Accids, KeySigs,
  TimeSigs, Clefs, Staffs, really exist for the sole purpose of displaying the music. They are full of coordinate data and 
  know how to draw themselves on the screen. 
  
*/

// Lets do a little parsing. This is the rhythm and note language. The parsing code is the best definition of that language.
// The Little Language notion: a VM (VirtualMachine) is a collection of registers (variables) that hold values. A string
// that is being parsed is a list of characters each single one of which is a single opcode (machine instruction) for the VM.
// each opcode gets to hammer on some of the registers. After you run the code (the string representing some measure) you are 
// left with useful stuff (music structures) in the VM.

function parseRN(vm, nextChar){ 
  var ch = nextChar();
  while(ch != 'EOF'){  // we grind through the characters in the input string
    vm.history += ch;
    var asc = ch.charCodeAt(0); var digit = -1; var yval = 9999;  // 3 special charclasses [0-9] [A-G] [a-g]
    if(asc >= 48 && asc <=57){digit = asc - 48; ch = 'num';}
    if(asc >= 65 && asc <=71){yval = (asc - 60)%7 - 6; ch = 'yval';}
    if(asc >= 97 && asc <=103){yval = (asc - 92)%7 +1; ch = 'yval';}
    if(ch != '-' && ch != 'num'){vm.inNum = false;}
    switch(ch){
      case 'num': vm.addDigit(digit); break; // generic integer input
      case 'yval': vm.setYVal(yval); break;  // for note heads, keys, clefs etc.
      case '-': vm.neg(); break; // either negates a number OR decs oShift
      case '+': vm.oShift.inc(); break; 
      case '/': vm.num2.set(vm.num.get()); break; // pushes num to num2
      
      case '.': vm.nDot.inc(); break;
      case "'": vm.nTic.inc(); break;
      case '~': vm.rest.inc(); break;
      case '!': vm.dir.set(1); break; //override either a beam direction or a stem direction
      case 'i': vm.dir.set(-1); break;

      case '(': vm.openBeam(); break;
      case ')': vm.closeBeam(); break;
      case '*': vm.addStem(1); break;
      case 'o': vm.addStem(2); break;
      case 'O': vm.addStem(4); break;
      case '^': vm.accid.inc(); break;
      case 'v': vm.accid.dec(); break;
      case ',': vm.stemAdvance(); break;
      case 'R': vm.staffNdx = 0; break;
      case 'L': vm.staffNdx = 1; vm.time = 0; vm.multivoice = 0; break;

      case '{': vm.pushTime(); break;
      case '}': vm.popTime(); break;
      
      /*

      case '[': vm.startTuple(); break;
      case ']': vm.endTuple(); break;
      
      case '_': vm.isTie(); break;
      
      case '=': vm.macroDef(); break;
    
      */
      default:

    }
    ch = nextChar();
  }
}

function Reg(vm, name){this.val = 0; this.isNull = true; this.name = name; this.vm = vm;}
Reg.prototype.set = function(v){
  if(!this.isNull){this.vm.warn('setting unconsumed ' + this.name);}
  this.val = v; this.isNull = false;
}
Reg.prototype.inc = function(){this.val++; this.isNull = false;}
Reg.prototype.dec = function(){this.val--;this.isNull = false;}
Reg.prototype.peek = function(){return this.val;}
Reg.prototype.goNull = function(){this.val = 0; this.isNull = true;}
// a null counter is just a zero never incremented so fetching a null is valid and does not warn 
Reg.prototype.getCount = function(){var res = this.val; this.goNull(); return res;}
// on the other hand, a get warns if you try to get a null.
Reg.prototype.get = function(){if(this.isNull){this.vm.warn('got a null '+this.name);}return this.getCount();}

function VM(){ // virtual machine for parsing music language
  this.history; // string of all parsed chars - used for error reports
  this.regs = []; // used by init to clear all regs.
  this.inNum = false; // only true if you are in the middle of accumulating an int 
  this.time; // startTime for next note  
  
  this.num = this.addReg('num'); 
  this.num2 = this.addReg('num2'); // only used it you push the first num
  this.y = this.addReg('Y'); // used for note heads, and other staff positioning. 
  // --counters--
  this.oShift = this.addReg('OctaveShift'); 
  this.nTic = this.addReg('nTic');
  this.nFlag = this.addReg('nFlag');
  this.nDot = this.addReg('nDot'); 
  this.rest = this.addReg('Rest'); 
  // general values
  this.accid = this.addReg('accid');
  this.bg = this.addReg('bg'); // this is the currently active bg (or null if not yet created)
  this.head = this.addReg('head');  // created by a-gA-G in anticipation that it may be a head.

  this.dir = this.addReg('dir');
  
  //this.tuple;

  this.hp; this.fp; // head pointer and flag pointer
  this.stems;
  this.bgs;
  this.timeGroup;
  this.timeStack;
  this.multiVoice;  
  
  this.staff; // this is a two long array to deal with grand staff. staff[0]==staff[1] for non-grand
  this.staffNdx; // index (0 or 1) of currently active staff. Heads go onto current staff. 
  
  this.init();  
}

VM.YCONSUMERS = 'k'; // opcodes that consume yVals
VM.prototype.parseRN = function(nextChar){parseRN(this, nextChar);}
VM.prototype.addReg = function(str){var r = new Reg(this, str); this.regs.push(r); return r;}
VM.prototype.warn = function(str){alert('PARSER WARNING - '+str+ '\n' + this.history);}
VM.prototype.init = function(){
  for(var i = 0; i<this.regs.length; i++){this.regs[i].goNull();}
  this.history = ''; this.inNum = false; this.time=0;
  this.stems = []; this.bgs = []; this.fp = 0; this.hp=0; this.staffNdx = 0; this.staff=[];
  this.timeStack = []; this.multiVoice = 0;
}

VM.prototype.setStaffs = function(s1, s2){this.staff[0] = s1; this.staff[1] = (s2 === undefined)? s1 : s2;}
VM.prototype.addDigit = function(d){
  if(!this.inNum){ // if we are not in a number, we must be starting up a new one
    this.num.set(d); // so set the most significant digit
    this.inNum = true;
  } else { // we are accumulating
    this.num.val = this.num.val*10 + d;
  }
}
VM.prototype.neg = function(){
  if(this.inNum){this.num.val = -this.num.val; this.inNum=false;} else {this.oShift.dec()};
}
VM.prototype.pushTime = function(){this.timeStack.push(vm.time); this.multiVoice = 1;}
VM.prototype.popTime = function(){var s = this.timeStack, n = s.length-1; this.time = s[n]; s.splice(n,1); this.multiVoice = -1;}
VM.prototype.getDur = function(hs){ // fetch nDot, nFlag, tuplet, - compute duration to add to time
  var d = this.nDot.getCount(); var f = this.nFlag.peek();
  // headShape (2=half,4=whole,1=quarter) only matters if we have no flags.
  var b = QUARTER_NOTE_DUR;
  if(f == 0){b *= hs} // base duration
  b = b/POW2[f]; // base duration adjusted by flags
  b = 2*b - b/POW2[d] // base adjusted for dots
  return b;
}
VM.prototype.openBeam = function(){
  this.nFlag.inc(); // first keep track of the flag count for duration calculation
  if(this.bg.isNull){this.bg.set(new BG(this.multiVoice)); this.bg.val.dir = this.dir.getCount();} // get a BG started if one doesn't exist
  this.bg.val.openBeam();
}
VM.prototype.closeBeam = function(){
  this.nFlag.dec(); // keep track of the flag count for duration calculation
  var f = this.nFlag.peek();
  if(f < 0){ths.warn("nFlag went negative")};
  this.bg.val.closeBeam();
  if(f == 0){var bg = this.bg.get(); this.bgs.push(bg);}
}
VM.prototype.addStem = function(hs){ // headshape 1=quarter,2=half,4=whole
  // we are either creating a new stem OR the stem was already created in a prior pitch list
  // in either case we are now in a position to attache the rhythmic elements, dots and rests to the stem.
  var stem; var r = this.rest.getCount(); var d = this.nDot.peek(); var f = this.nFlag.peek();
  
  if(r != 0){ // we have a rest. 
    stem = new Stem(); // Rest stems do NOT go on the stems list
    if(this.head.isNull){
      stem.addHead(new Head(this.staff[this.staffNdx], 0, 0)); // null head, create default rest location
    } else {
      stem.addHead(this.head.get()); this.y.get(); this.hp++ // head override for rest location
    }    
  } else { // not a rest
    if(this.fp < this.stems.length){ // setem already exist so pick it up
      stem = this.stems[this.fp++];
    } else {
      stem = new Stem(); this.stems.push(stem); this.fp++;
    }
    // If there is a yVal/Head, since nothing else consumed it first it must be a head
    // and we can increment hp because we are in interlace mode.
    // adding a stem, with no intervening head is the signal that we are not interlaced
    if(!this.head.isNull){stem.addHead(this.head.get()); this.y.get(); this.hp++} 
  } 
  stem.setHeadShape(hs); 
  stem.dir = vm.dir.getCount(); // pick up stem dir override if any
  // our stem will use the current time start time. then update time
  var startTime = this.timeGroup.get(this.time);
  stem.setRhythm(startTime, d, r, f);
  // we are ready to add the stem to the bg but must be careful it might not exist yet.
  if(this.bg.isNull){ // the reason it might not exist is that it is stand along with no flags
    // in which case, create it, add the stem, and be done with it.
    var bg = new BG(this.multiVoice); bg.addStem(stem); this.bgs.push(bg)
  } else {
    this.bg.val.addStem(stem);
  }
  // finally update time - call to getDur clears nDot and we cleared isRest above
  this.time += this.getDur(hs);  
}
VM.prototype.setYVal = function(v){ // sets val and creates a head (flushing old head if necessary)
  var t = this.nTic.getCount();
  var y = ((v<=0)? v - 7*t : v + 7*t);
  
  // note - this.y and this.head are linked - creating y always creates a head (which we may toss)
  // y and head must always be created, conusmed, detroyed together. Basically you either used the y
  // as a head or you didn't. If anything consumes the y it must destroy the head. If anything claims
  // the head it must destroy the y.
  
  var h = new Head(this.staff[this.staffNdx], y, this.accid.getCount());
  if(this.head.isNull){ // just creating a head does not join it to a stem ...
    this.head.set(h); this.y.set(y);
  } else {// ..but the existence of a previous head causes the previous to join.
    if(this.hp == this.stems.length){
      var stem = new Stem(); this.stems.push(stem);
    } 
    this.stems[this.hp].addHead(this.head.get());
    this.head.set(h);
    this.y.get(); // flush the old y val
    this.y.set(y)
  } 
}
VM.prototype.stemAdvance = function(){
  if(!this.head.isNull){
    if(this.hp == this.stems.length){
      this.stems.push(new Stem());
    }
    var stem = this.stems[this.hp];
    while(stem.isRest){this.hp++; stem = this.stems[this.hp];}
    stem.addHead(this.head.get()); this.y.get();
  } 
  this.hp++;
}


// -------

function BG(mv){
  this.beams=[]; this.stems=[]; BG.lev=0; 
  this.first=-1; this.last=-1; this.multiVoice=mv// ndx of non-rest stems i.e. the first and last stem for beam layout 
  this.dir=0; this.y1=0; this.y2=0; this.x1=0; this.x2=0; // master beam coordinates set by layout()
} // note: finish one BG before starting another.
BG.prototype.openBeam = function(){this.beams.push([BG.lev++, this.stems.length, 9999]);}
BG.prototype.addStem = function(s){
  this.stems.push(s); s.bg=this; s.nFlag = BG.lev; 
  if(!s.isRest){this.last=this.stems.length-1; if(this.first == -1){this.first = this.last;}}
}
BG.prototype.closeBeam = function(){ // need to close last beam on list with 99999
  var ndx=0; for(var i=0; i<this.beams.length; i++){if(this.beams[i][2] == 9999){ndx = i;}}
  if(ndx >= 0){var b = this.beams[ndx]; b[2] = this.stems.length-1; BG.beamlet(b,-1); BG.lev--;}
}
  // helper function set beamlet right with i == 1 and beamlet left with i == -1;
BG.beamlet = function(b, i){if(b[1] == b[2] && i*b[1] < 0){b[1] = -b[1]; b[2] = -b[2];}}
BG.prototype.svg = function(svgStr){
  this.layout(); // determine the endpoints of the master beam and dir 
  for(var i = 0; i<this.stems.length; i++){var s = this.stems[i]; s.svg(svgStr);}

  if(this.first != -1 && this.beams.length != 0){
    for(var i = 0; i<this.beams.length; i++){
      var lev = this.beams[i][0], s1 = this.stems[Math.abs(this.beams[i][1])], s2 = this.stems[Math.abs(this.beams[i][2])];
      var gap = this.stems[this.first].heads[0].staff.gap;
      if(s1.isRest || s2.isRest){
        // more work to do
      }
      var dy = lev*2*this.dir*gap;
      var x1 = s1.x(), y1 = s1.bg.yOfX(x1);      
      if(s1 == s2){// beamlet
        var x2 = x1 + gap*2*((this.beams[i][1] <0) ? -1: 1);
      } else {
        var x2 = s2.x();
      }
      var y2 = s2.bg.yOfX(x2);
      svgStr.beam(gap,x1,y1 + dy,x2,y2 + dy);
    }
  }

}
BG.prototype.inheritDir = function(obj){if(this.dir == 0 && obj.dir != 0){this.dir = obj.dir;}}
BG.prototype.layout = function(){ // determine stem directions of first and last stems and dir if not forced.
  if(this.first == -1){return 0;} // no beam layout necessary for a bg with no active stems
  var s1 = this.stems[this.first], s2 = this.stems[this.last];
  this.inheritDir(s2); this.inheritDir(s1); s1.inheritDir(this); s2.inheritDir(this); 
  // so if either s1 or s2 had a dir then pg has a dir. next pgs dir is propagated to s1 and s2
  // thus either all directions are set or none are. If set, they match as much as possible.
  var mv = this.multiVoice;
  if(this.dir == 0 && mv !=0){this.dir = mv; s1.dir = mv; s2.dir = mv;} // free groups are forced by multivoicing
  // at this point all could still be free in which case set all to same direction as whatever works for s1
  if(this.dir == 0){
    if(s1.heads.length == 1){
      s1.dir = (s1.hiHeadLine() < 0)?1:-1;
    } else {
      var hi = s1.hiHeadLine(), lo = s1.loHeadLine();
      s1.dir = (Math.abs(hi) > Math.abs(lo))? -1 : 1;
    }
    s2.dir = s1.dir; this.dir = s1.dir;
  } 
  // now all directions are set. So we can compute actual endpoints.
  var st1 = s1.heads[0].staff, st2 = s2.heads[0].staff;
  this.y1 = st1.yOfLine((s1.dir == 1) ? s1.hiHeadLine() + 7 : s1.loHeadLine() - 7); 
  this.y2 = st2.yOfLine((s2.dir == 1) ? s2.hiHeadLine() + 7 : s2.loHeadLine() - 7);
  this.x1 = st1.x(s1.time.x()) + s1.dir*st1.gap*3/2;  
  this.x2 = st2.x(s2.time.x()) + s2.dir*st2.gap*3/2; 
  if(s1 == s2){this.x2 = this.x1 + st1.gap*3/2; this.y2 = this.y1 + s1.dir*st1.gap;}  
  // actually up to this point we have only set the directions for the first and last stem
  // now we should go through all the stems and determine if they are up or down. And we should
  // probably do something intelligent about rests at this point (internal beams could look like two elements
  // .. but because one is a rest, it is actually a singlton and needs a beamlet)
  for(var i = 0; i<this.stems.length; i++){
    var s=this.stems[i];
    if(s.dir == 0){
      var h = s.heads[0];
      var hy = h.y(), fy = this.yOfX(s.x());
      s.dir = (hy > fy) ? 1:-1;  
    }
  }
  
}
BG.prototype.yOfX = function(x){
  var dx = this.x2 - this.x1, dy = this.y2 - this.y1;
  return this.y1 + dy*(x - this.x1)/dx;
}


function Stem(){
  this.heads=[]; this.nDot=0; this.isRest=false; this.nFlag = -3;
  this.bg=null; this.time=null; this.headShape = 1; this.dir=0;
}
Stem.prototype.inheritDir = function(obj){if(this.dir == 0 && obj.dir != 0){this.dir = obj.dir;}}
Stem.prototype.setRhythm = function(t, d, r, f){this.time=t; this.nDot=d; this.isRest=r; this.nFlag=f;}
Stem.prototype.addHead = function(h){this.heads.push(h); h.stem=this;}
Stem.prototype.setHeadShape = function(hs){this.headShape = hs;}

Stem.prototype.svg = function(svgStr){
  if(this.isRest){
    var r = this.heads[0], st = r.staff, gap = st.gap, y = r.y();
    this.time.setDefaultWidth(gap);
    var x = st.x(r.stem.time.x());
    if(this.nFlag > 0){
      svgStr.flagRest(this.nFlag, x, y, gap);
    } else {
      switch (this.headShape){
        case 4: svgStr.beam(gap,x-3*gap/2, y-2*gap, x+3*gap/2, y-2*gap); break;
        case 2: svgStr.beam(gap,x-3*gap/2, y-gap, x+3*gap/2, y-gap); break;
        default: svgStr.qRest(gap, x, y);
      }
    }
  } else { // not a rest
    if(this.headShape != 4){ // if we are not a whole rest we draw the line 
      var st = this.heads[0].staff; 
      var x = this.x();
      var hy = st.yOfLine((this.dir == 1) ? this.loHeadLine() : this.hiHeadLine()); // y of head
      svgStr.line(x, hy, x, this.bg.yOfX(x));
    }
    this.layoutHeads();
    for(var i = 0; i<this.heads.length; i++){this.heads[i].svg(this.time.x(), svgStr);}
  }
}
Stem.prototype.x = function(){var st = this.heads[0].staff; return st.x(this.time.x()) + this.dir*st.gap*3/2;}

Stem.prototype.layoutHeads = function(){ // set wrong side for notes a second apart
  if(this.isRest){return 0;}
  var firstHead = true, previousHead = null, dl = this.dir;
  var ndx = (dl == 1) ? this.heads.length - 1 : 0; //
  while(ndx >= 0 && ndx < this.heads.length){
    var h = this.heads[ndx];
    if(firstHead){
      h.wrongSide = false;
      firstHead = false;
    } else {
      h.wrongSide = (previousHead.line + dl == h.line && !previousHead.wrongSide);
    }
    previousHead = h;
    ndx -= dl;
  }
}

Stem.prototype.hiHeadLine = function(){return this.heads[0].line;}
Stem.prototype.loHeadLine = function(){return this.heads[this.heads.length-1].line;}

function Head(s, y, a){this.staff=s; this.line=y; this.accid=a; this.stem=null; this.wrongSide = false;}
Head.prototype.svg = function(x, svgStr){
  var cx = this.staff.x1 + x; var cy = this.staff.yOfLine(this.line); var rx = this.staff.gap*3/2; var ry = this.staff.gap;
  var g = this.staff.gap, time = this.stem.time;
  // add space for head
  time.setDB(g*W_HM); time.setDA(g*W_HM);
  // adjust cx for wrong side
  if(this.wrongSide){
    cx += this.stem.dir*(rx+rx);
  }
  
  // ledger lines
  var lw = 2.5*this.staff.gap;
  if(this.line < - 5){
    for(var i = -6; i>=this.line; i -= 2){var ly = this.staff.yOfLine(i); svgStr.line(cx-lw, ly, cx+lw, ly);}
  } else if(this.line > 5){
    for(var i = 6; i<=this.line; i += 2){var ly = this.staff.yOfLine(i); svgStr.line(cx-lw, ly, cx+lw, ly);}  
  }
  
  // draw quarter or half heads
  if(this.stem.headShape == 1){svgStr.fE(cx,cy,rx,ry);} else {svgStr.hE(cx,cy,rx,ry)};

  if(this.accid == 1){time.setDB(g*W_HMA); svgStr.sharp(g, cx - 2.5*rx, cy);}
  if(this.accid == 2){time.setDB(g*W_HMA); svgStr.doubleSharp(g, cx - 2.5*rx, cy);}
  if(this.accid == -1){time.setDB(g*W_HMA); svgStr.flat(g, cx - 2.5*rx, cy);}
  if(this.accid == -2){time.setDB(g*W_HMA); svgStr.doubleFlat(g, cx - 2.5*rx, cy);}
}
Head.prototype.y = function(){return this.staff.yOfLine(this.line);}

Staff.Five = [-4,-2,0,2,4]; // the standard 5 line staff
function Staff(lines, gap, y, x1, x2){this.lines = lines, this.gap = gap; this.yVal=y; this.x1=x1; this.x2=x2;}
Staff.prototype.yOfLine = function(line){return this.yVal - this.gap*line;}
Staff.prototype.x = function(x){return this.x1 + x;}
Staff.prototype.svg = function(svgStr){
  for(var i=0; i<this.lines.length; i++){var y = this.yOfLine(this.lines[i]); svgStr.line(this.x1,y,this.x2,y);}
}




