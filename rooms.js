const REFERENCE = { width: 2728, height: 2048 };

// id はゲーム内の識別子。file には元のZIP内のファイル名を記載する。
const ROOMS = {
  room1: {
    directory: 'videos/room1/',
    next: 'room2',
    videoSound: false,
    music: null,
    clips: [
      { id: 'hajime', file: 'hazime.mp4' },
      { id: 'koguri', file: 'syoukuri.mp4', label: '電球の光', hit: [1780, 735, 310, 265] },
      { id: 'hirogari', file: 'hirogari.mp4' },
      { id: 'nakaguri', file: 'tyuukuri.mp4', label: '時計', hit: [1970, 515, 220, 230] },
      { id: 'tokei_stop', file: 'tokeiwotomeru.mp4' },
      { id: 'ooguri', file: 'daikuri.mp4', label: 'ジョウロ', hit: [1610, 510, 190, 250] },
      { id: 'aruku', file: 'aruku.mp4' },
      { id: 'tomaru', file: 'tomaru.mp4', label: 'ドア', hit: [800, 485, 190, 515] },
      { id: 'sotohe', file: 'sotohe.mp4' },
    ],
  },
};
