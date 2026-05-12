// ============================================================
// data.js — Palette de couleurs + albums par défaut
// ============================================================

export const COLORS = [
  { color:'#1a0a2e', rim:'#4a2080' },
  { color:'#1e0a0a', rim:'#802020' },
  { color:'#0a1a0a', rim:'#206020' },
  { color:'#0a0f1e', rim:'#203060' },
  { color:'#1a1500', rim:'#604010' },
  { color:'#001a1a', rim:'#106060' },
];

export const DEFAULT_ALBUMS = [
  {
    title:'Dark Side of the Moon', artist:'Pink Floyd', year:1973,
    label:'Harvest', condition:'Excellent (VG+)',
    value:'~45 €', color:'#1a0a2e', rim:'#4a2080',
    low:'30 €', mid:'45 €', high:'75 €', notes:'',
    coverUrl:'https://coverartarchive.org/release/7c5ee197-2b33-4b42-bd68-8dba1eda97d1/front-250',
    tracks:['Speak to Me','Breathe','On the Run','Time','The Great Gig in the Sky','Money','Us and Them','Any Colour You Like','Brain Damage','Eclipse'],
    durations:['1:08','2:43','3:35','7:04','4:15','6:23','7:51','3:26','3:47','2:03'],
  },
  {
    title:'Rumours', artist:'Fleetwood Mac', year:1977,
    label:'Warner Bros.', condition:'Très bon (VG)',
    value:'~28 €', color:'#1e0a0a', rim:'#802020',
    low:'20 €', mid:'28 €', high:'55 €', notes:'',
    coverUrl:'https://coverartarchive.org/release/eacd8f33-48bf-40c3-8275-9d2765bfb3e1/front-250',
    tracks:['Second Hand News','Dreams','Never Going Back Again',"Don't Stop",'Go Your Own Way','Songbird','The Chain','You Make Loving Fun',"I Don't Want to Know",'Oh Daddy'],
    durations:['2:43','4:14','2:02','3:12','3:38','3:36','4:30','3:31','3:15','3:08'],
  },
  {
    title:'Abbey Road', artist:'The Beatles', year:1969,
    label:'Apple Records', condition:'Bon (G+)',
    value:'~60 €', color:'#0a1a0a', rim:'#206020',
    low:'45 €', mid:'60 €', high:'120 €', notes:'',
    coverUrl:'https://coverartarchive.org/release/7e0e5d98-69a0-31ba-b7fe-05cd42e90b24/front-250',
    tracks:['Come Together','Something',"Maxwell's Silver Hammer",'Oh! Darling',"Octopus's Garden",'I Want You','Here Comes the Sun','Because','You Never Give Me Your Money','Sun King'],
    durations:['4:20','3:01','3:27','3:26','2:51','7:47','3:04','2:45','3:57','2:25'],
  },
  {
    title:'Kind of Blue', artist:'Miles Davis', year:1959,
    label:'Columbia', condition:'Excellent (VG+)',
    value:'~35 €', color:'#0a0f1e', rim:'#203060',
    low:'25 €', mid:'35 €', high:'80 €', notes:'',
    coverUrl:'https://coverartarchive.org/release/3bb4a6e3-2097-478c-8d82-2e28fef8cb5e/front-250',
    tracks:['So What','Freddie Freeloader','Blue in Green','All Blues','Flamenco Sketches'],
    durations:['9:22','9:46','5:37','11:33','9:26'],
  },
];
