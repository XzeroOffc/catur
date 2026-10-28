export const CHAPTERS=[
 {title:'Panggilan penjaga',text:'Temui Nara di Kamp Pelita. Dekati penanda lalu tekan Aksi.',x:6,y:7,label:'Nara',dialog:'Nara: Pelita di timur telah padam. Cari prasasti di Hutan Lumut, lalu bawa kabar kembali.'},
 {title:'Jejak di Hutan Lumut',text:'Temukan prasasti hutan di (29, 6). Gunakan Aksi untuk membacanya.',x:29,y:6,label:'Prasasti hutan',dialog:'Prasasti: Cahaya tersimpan di altar reruntuhan. Penjaga terakhir membawa kuncinya.'},
 {title:'Menyeberangi sungai',text:'Temukan gerbang reruntuhan di (26, 20). Jembatan berada di baris 18 dan 19.',x:26,y:20,label:'Gerbang timur',dialog:'Gerbang: Kalahkan Penjaga Segel di tenggara. Setelah itu aktifkan altar.'},
 {title:'Penjaga Segel',text:'Kalahkan Penjaga Segel dekat (35, 28), lalu aktifkan altar di (36, 30).',x:36,y:30,label:'Altar Pelita',dialog:'Pelita menyala kembali. Kembalilah menemui Nara untuk menerima hadiah.'},
 {title:'Pulang membawa cahaya',text:'Kembali ke Nara di (6, 7), lalu tekan Aksi. Hadiah: 150 koin, 120 EXP, dan 3 ramuan.',x:6,y:7,label:'Nara',dialog:'Nara: Cahaya telah kembali. Terima kasih, penjelajah. Dunia masih terbuka untukmu.'}
];
export function storyTarget(story){return CHAPTERS[story?.stage||0]||null;}
