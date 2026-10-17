/*
 * Renderizador compartilhado das cartas (leitura e editor).
 * As listas de opções espelham app/content.php — mantenha as duas em sincronia.
 */
(function () {
  'use strict';

  const FONTS = {
    caveat: { label: 'Caveat', css: "'Caveat', cursive", scale: 1.3 },
    dancing: { label: 'Dancing Script', css: "'Dancing Script', cursive", scale: 1.2 },
    indie: { label: 'Indie Flower', css: "'Indie Flower', cursive", scale: 1.05 },
    patrick: { label: 'Patrick Hand', css: "'Patrick Hand', cursive", scale: 1.12 },
    shadows: { label: 'Shadows Into Light', css: "'Shadows Into Light', cursive", scale: 1.15 },
    homemade: { label: 'Homemade Apple', css: "'Homemade Apple', cursive", scale: 0.85 },
    gloria: { label: 'Gloria Hallelujah', css: "'Gloria Hallelujah', cursive", scale: 0.92 },
    special: { label: 'Máquina de escrever', css: "'Special Elite', monospace", scale: 0.95 },
    playfair: { label: 'Playfair (elegante)', css: "'Playfair Display', serif", scale: 1 },
    lora: { label: 'Lora (livro)', css: "'Lora', serif", scale: 1 },
    nunito: { label: 'Nunito (simples)', css: "'Nunito', sans-serif", scale: 1 },
    quicksand: { label: 'Quicksand (redonda)', css: "'Quicksand', sans-serif", scale: 1 },
    pacifico: { label: 'Pacifico', css: "'Pacifico', cursive", scale: 1 },
    greatvibes: { label: 'Great Vibes', css: "'Great Vibes', cursive", scale: 1.38 },
    satisfy: { label: 'Satisfy', css: "'Satisfy', cursive", scale: 1.15 },
    amatic: { label: 'Amatic SC', css: "'Amatic SC', cursive", scale: 1.45 },
    kalam: { label: 'Kalam', css: "'Kalam', cursive", scale: 1 },
    sacramento: { label: 'Sacramento', css: "'Sacramento', cursive", scale: 1.5 },
    courier: { label: 'Courier Prime', css: "'Courier Prime', monospace", scale: 0.88 },
    reenie: { label: 'Reenie Beanie', css: "'Reenie Beanie', cursive", scale: 1.3 },
    fredoka: { label: 'Fredoka (fofinha)', css: "'Fredoka', sans-serif", scale: 0.98 },
    cormorant: { label: 'Cormorant (clássica)', css: "'Cormorant Garamond', serif", scale: 1.2 },
    marker: { label: 'Permanent Marker', css: "'Permanent Marker', cursive", scale: 0.88 },
    nanum: { label: 'Nanum Pen', css: "'Nanum Pen Script', cursive", scale: 1.3 },
  };

  const PAPERS = {
    plain: 'Liso', lined: 'Pautado', grid: 'Quadriculado', dots: 'Pontilhado',
    kraft: 'Kraft', vintage: 'Antigo', parchment: 'Pergaminho', image: 'Sua imagem',
    watercolor: 'Aquarela', linen: 'Linho', notebook: 'Caderno', music: 'Pauta musical', gradient: 'Degradê',
  };
  const BORDERS = {
    none: 'Sem borda', simple: 'Simples', double: 'Dupla', dashed: 'Tracejada',
    stamp: 'Selo postal', hearts: 'Corações', flowers: 'Flores',
    stars: 'Estrelas', scallop: 'Ondulada', polaroid: 'Polaroid', ticket: 'Ingresso',
  };
  const SCENES = {
    desk: 'Mesa de madeira', pink: 'Rosa suave', sky: 'Céu', night: 'Noite estrelada', garden: 'Jardim', plain: 'Neutro', image: 'Sua imagem',
    sunset: 'Pôr do sol', beach: 'Praia', lavender: 'Lavanda', confetti: 'Confete', wood: 'Madeira escura', marble: 'Mármore',
  };
  const LINERS = { plain: 'Liso', stripes: 'Listras', dots: 'Bolinhas', hearts: 'Corações', stars: 'Estrelas', flowers: 'Florzinhas', checks: 'Xadrez' };
  const DIVIDERS = {
    line: 'Linha', dashed: 'Tracejado', dots: 'Pontinhos', hearts: 'Corações',
    stars: 'Estrelas', flowers: 'Flores', wave: 'Onda',
  };
  const DIVIDER_TEXT = { dots: '• • •', hearts: '♡  ♥  ♡', stars: '✦  ✧  ✦', flowers: '✿  ❀  ✿' };
  const FRAMES = { plain: 'Simples', polaroid: 'Polaroid', rounded: 'Arredondada', tape: 'Com fita', circle: 'Círculo' };
  const TAPES = ['pink', 'mint', 'yellow', 'lilac', 'dots', 'stripes', 'grid', 'hearts', 'flowers', 'stars', 'gingham', 'kraft', 'glitter', 'rainbow'];
  const TEXT_STYLES = {
    none: 'Só texto', label: 'Etiqueta', note: 'Post-it', bubble: 'Balão',
    neon: 'Neon', outline: 'Contorno', tag: 'Tag', ticket: 'Ingresso', shadow: 'Sombra retrô',
  };

  // Rabiscos desenhados à mão (viewBox 0 0 100 100). "fill" = preenchido.
  const DOODLES = {
    heart: { label: 'Coração', d: 'M50 83C22 63 9 47 13 31 17 16 37 12 50 31 63 12 83 15 87 31 91 47 78 63 50 83Z' },
    'heart-fill': { label: 'Coração cheio', fill: true, d: 'M50 83C22 63 9 47 13 31 17 16 37 12 50 31 63 12 83 15 87 31 91 47 78 63 50 83Z' },
    star: { label: 'Estrela', d: 'M50 9 61 37 91 39 67 58 76 89 50 72 24 89 33 58 9 39 39 37Z' },
    sparkle: { label: 'Brilho', fill: true, d: 'M50 6C53 38 62 47 94 50 62 53 53 62 50 94 47 62 38 53 6 50 38 47 47 38 50 6Z' },
    arrow: { label: 'Seta', d: 'M10 72C28 32 58 22 86 34M86 34 70 22M86 34 73 49' },
    'arrow-loop': { label: 'Seta com laço', d: 'M8 64C24 42 46 40 46 56 46 71 25 69 30 52 36 33 62 29 90 44M90 44 75 33M90 44 77 58' },
    swirl: { label: 'Espiral', d: 'M50 50C50 44 58 44 58 50 58 58 46 60 42 52 36 42 48 32 58 36 72 41 70 62 56 68 38 76 23 60 27 43 31 26 52 18 68 24' },
    squiggle: { label: 'Rabisco', d: 'M5 55C13 39 22 39 28 55 34 71 42 71 48 55 54 39 62 39 68 55 74 71 83 71 95 51' },
    circle: { label: 'Círculo', d: 'M50 13C77 11 93 32 89 55 85 79 58 91 35 85 13 79 5 54 13 33 21 17 44 9 68 18' },
    underline: { label: 'Sublinhado', d: 'M5 48C30 42 61 57 95 44M14 60C40 55 62 64 87 57' },
    flower: { label: 'Flor', d: 'M50 43C37 22 63 22 50 43M57 48C76 36 83 61 58 54M55 58C66 79 43 82 50 60M45 58C33 78 17 63 42 53M43 48C20 44 29 21 50 43M50 60V93M50 80C58 72 66 72 70 74' },
    leaf: { label: 'Folha', d: 'M18 82C18 42 48 18 86 15 84 53 60 82 18 82ZM18 82C38 62 55 45 70 30' },
    cloud: { label: 'Nuvem', d: 'M27 71C13 71 11 52 25 50 23 35 42 29 50 40 56 25 79 27 79 46 93 46 93 71 76 71Z' },
    sun: { label: 'Sol', d: 'M50 34A16 16 0 1 0 50.1 34ZM50 7V19M50 81V93M7 50H19M81 50H93M20 20 28 28M72 72 80 80M80 20 72 28M28 72 20 80' },
    moon: { label: 'Lua', d: 'M62 13C39 18 27 40 33 61 40 81 65 90 85 77 60 78 45 60 49 39 51 27 56 19 62 13Z' },
    smile: { label: 'Carinha', d: 'M50 12A38 38 0 1 0 50.1 12ZM37 39V45M63 39V45M31 59C40 73 60 73 69 59' },
    xo: { label: 'XO', d: 'M10 33 36 63M36 33 10 63M67 33C51 33 49 63 67 63 84 63 82 33 67 33Z' },
    crown: { label: 'Coroa', d: 'M13 72 19 31 36 52 50 23 64 52 81 31 87 72ZM13 81H87' },
    bow: { label: 'Laço', d: 'M50 48C36 28 13 32 17 49 21 64 40 60 50 48 60 60 79 64 83 49 87 32 64 28 50 48ZM50 48 39 82M50 48 62 82' },
    note: { label: 'Nota musical', d: 'M27 74A10 8 0 1 0 47 74 10 8 0 1 0 27 74ZM47 74V22L79 15V65M59 65A10 8 0 1 0 79 65 10 8 0 1 0 59 65Z' },
    flower2: { label: 'Margarida', d: 'M56 36A6 6 0 1 1 44 36 6 6 0 1 1 56 36ZM47 31C40 20 47 10 51 12 55 15 55 24 52 30M56 33C64 25 75 27 74 33 73 38 64 40 57 38M55 42C61 50 58 60 53 59 48 58 47 50 50 43M45 42C40 51 31 52 29 47 27 42 35 38 44 38M44 33C34 31 30 22 35 19 40 16 46 24 47 30M50 43C48 58 52 72 49 94M50 74C42 64 31 64 27 70 34 76 43 77 50 74' },
    leaf2: { label: 'Raminho', d: 'M18 90C38 66 58 42 82 10M32 72C20 68 16 57 20 50 29 53 34 62 32 72ZM44 58C56 60 64 54 67 47 57 44 48 49 44 58ZM55 43C46 36 45 26 49 19 56 25 58 35 55 43ZM67 29C77 29 83 23 86 17 76 16 69 21 67 29Z' },
    sun2: { label: 'Solzinho', d: 'M50 34A16 16 0 1 0 50.1 34ZM50 8C47 14 53 18 50 25M50 75C47 81 53 85 50 92M8 50C14 47 18 53 25 50M75 50C81 47 85 53 92 50M21 21C27 22 27 27 32 31M68 68C73 71 73 76 79 79M79 21C77 27 72 27 68 32M32 68C28 73 23 73 21 79M43 53C46 58 54 58 57 53M44 45V46M56 45V46' },
    moon2: { label: 'Lua e estrelas', d: 'M56 14C37 18 26 36 29 55 32 75 51 88 71 84 54 77 44 62 45 46 46 33 50 22 56 14ZM76 22V36M69 29H83M78 56V64M74 60H82' },
    cloud2: { label: 'Nuvem de chuva', d: 'M28 60C15 60 11 46 23 42 21 28 39 22 47 32 53 18 76 20 76 38 90 38 92 60 76 60ZM34 72 30 82M52 72 48 82M70 72 66 82M43 84 40 92M61 84 58 92' },
    crown2: { label: 'Tiara', d: 'M18 72C16 56 14 44 14 33L32 50 50 24 68 50 86 33C86 44 84 56 82 72ZM18 72C40 78 60 78 82 72M20 82C40 88 60 88 80 82M14 22A4 4 0 1 0 14.1 22ZM50 12A4 4 0 1 0 50.1 12ZM86 22A4 4 0 1 0 86.1 22ZM50 58A5 5 0 1 0 50.1 58Z' },
    music: { label: 'Música', d: 'M24 78C24 71 34 66 39 70 44 75 36 84 29 84 26 84 24 81 24 78ZM39 72V24C47 30 58 32 62 44M60 66C60 59 70 54 75 58 80 63 72 72 65 72 62 72 60 69 60 66ZM75 60V30M67 18 71 22M82 16 78 22' },
    lips: { label: 'Beijo', d: 'M10 52C20 38 34 30 44 36 47 38 49 40 50 40 51 40 53 38 56 36 66 30 80 38 90 52 78 70 64 78 50 78 36 78 22 70 10 52ZM10 52C30 57 70 57 90 52M30 50C38 53 44 54 50 54' },
    envelope: { label: 'Envelope', d: 'M14 28C30 27 70 27 86 29 87 44 87 60 86 74 62 75 38 75 14 74 13 58 13 42 14 28ZM14 29C28 40 40 50 50 56 60 50 72 40 86 29M14 74 40 52M86 74 60 52' },
    camera: { label: 'Câmera', d: 'M14 37C14 33 16 31 20 31H32L38 22H62L68 31H80C84 31 86 33 86 37V72C86 76 84 78 80 78H20C16 78 14 76 14 72ZM50 40A14 14 0 1 0 50.1 40ZM50 47A7 7 0 1 0 50.1 47ZM73 39H79' },
    coffee2: { label: 'Cafezinho', d: 'M22 40H70V64C70 75 62 82 52 82H40C30 82 22 75 22 64ZM70 46C83 45 84 62 70 63M36 32C32 26 40 22 36 14M52 32C48 26 56 22 52 14M46 69C38 63 38 56 42 55 44 54 46 56 46 58 46 56 48 54 50 55 54 56 54 63 46 69Z' },
    cake: { label: 'Bolo', d: 'M16 84H84M22 84V60H78V84M27 60V46H73V60M22 70C30 76 36 64 44 70 52 76 58 64 66 70 72 74 76 68 78 68M50 46V34M50 33C45 29 47 23 50 18 53 23 55 29 50 33Z' },
    gift: { label: 'Presente', d: 'M18 42H82V54H18ZM24 54V86H76V54M50 42V86M50 42C40 26 26 28 31 37 35 42 50 42 50 42ZM50 42C60 26 74 28 69 37 65 42 50 42 50 42Z' },
    balloon: { label: 'Balão', d: 'M50 10C34 10 26 24 28 39 30 53 42 63 50 65 58 63 70 53 72 39 74 24 66 10 50 10ZM46 65H54L50 71ZM50 71C44 77 56 81 50 87 46 91 51 94 48 98M37 28C39 22 43 19 48 19' },
    butterfly: { label: 'Borboleta', d: 'M50 32V78M50 38C40 18 14 18 16 34 18 48 38 50 50 48M50 48C38 52 22 60 28 72 34 82 46 70 50 60M50 38C60 18 86 18 84 34 82 48 62 50 50 48M50 48C62 52 78 60 72 72 66 82 54 70 50 60M50 32C46 24 40 19 35 17M50 32C54 24 60 19 65 17' },
    rainbow: { label: 'Arco-íris', d: 'M10 74C10 46 30 26 50 26 70 26 90 46 90 74M22 74C22 54 36 38 50 38 64 38 78 54 78 74M34 74C34 61 42 50 50 50 58 50 66 61 66 74M4 80C4 74 11 71 15 75 18 70 27 72 27 80ZM73 80C73 73 81 71 85 75 88 71 97 73 96 80Z' },
    umbrella: { label: 'Guarda-chuva', d: 'M10 50C14 28 30 16 50 16 70 16 86 28 90 50 84 44 76 44 70 50 64 44 56 44 50 50 44 44 36 44 30 50 24 44 16 44 10 50ZM50 50V80C50 89 39 89 39 81M50 16V10M30 50C32 32 40 20 50 16 60 20 68 32 70 50' },
    plane2: { label: 'Avião de papel', d: 'M10 46 90 16 64 82 48 58ZM48 58 90 16M48 58 47 76 57 67M8 68C12 72 18 72 22 68M14 82C20 86 26 85 30 81' },
    house: { label: 'Casinha', d: 'M14 50 50 18 86 50M24 42V84H76V42M42 84V64C42 58 58 58 58 64V84M62 30V16H72V39M30 54H38V62H30Z' },
    key: { label: 'Chave', d: 'M30 32A16 16 0 1 0 30.1 32ZM30 42A6 6 0 1 0 30.1 42ZM46 48H86M74 48V60M84 48V58' },
    lock: { label: 'Cadeado', d: 'M28 46C42 45 58 45 72 46 73 58 73 72 72 84 58 85 42 85 28 84 27 72 27 58 28 46ZM36 46V34C36 17 64 17 64 34V46M50 56A4 4 0 1 0 50.1 56ZM50 64V72' },
    ring: { label: 'Anel', d: 'M50 40A24 24 0 1 0 50.1 40ZM50 46A18 18 0 1 0 50.1 46ZM40 30 50 42 60 30 55 21H45ZM40 30H60M50 21V30' },
    cat2: { label: 'Gatinho', d: 'M22 42 25 16 42 30C47 28 53 28 58 30L75 16 78 42C82 62 68 77 50 77 32 77 18 62 22 42ZM38 46V51M62 46V51M46 57 50 61 54 57M50 61V64M28 59 12 57M28 65 14 70M72 59 88 57M72 65 86 70' },
    paw: { label: 'Patinha', fill: true, d: 'M50 52C38 52 28 66 32 76 36 85 46 80 50 80 54 80 64 85 68 76 72 66 62 52 50 52ZM26 28A7 9 0 1 0 26.1 28ZM41 14A7 9 0 1 0 41.1 14ZM59 14A7 9 0 1 0 59.1 14ZM74 28A7 9 0 1 0 74.1 28Z' },
  };

  // Selos postais ilustrados (viewBox 0 0 60 72)
  const STAMPS = {
    heart: { label: 'Coração', bg: '#f4d6d1', svg: '<path d="M30 52C14 41 9 32 12 24c3-7 12-8 18 1 6-9 15-8 18-1 3 8-2 17-18 28z" fill="#b8323b"/>' },
    flower: { label: 'Flor', bg: '#e6edd4', svg: '<path d="M30 40v20" stroke="#5c7d3a" stroke-width="2.5"/><path d="M30 52c5-6 10-6 12-5" stroke="#5c7d3a" stroke-width="2.5" fill="none"/><g fill="#e48aa0"><circle cx="30" cy="20" r="6.5"/><circle cx="39" cy="27" r="6.5"/><circle cx="36" cy="37" r="6.5"/><circle cx="24" cy="37" r="6.5"/><circle cx="21" cy="27" r="6.5"/></g><circle cx="30" cy="29" r="5" fill="#f2c14e"/>' },
    bird: { label: 'Passarinho', bg: '#d9e7ef', svg: '<path d="M14 40c4-12 16-17 26-12l8-4-3 7c2 9-6 19-19 18-5 0-9-3-12-9z" fill="#3f6f95"/><path d="M22 36c5 1 11-1 15-6" stroke="#d9e7ef" stroke-width="2" fill="none"/><circle cx="41" cy="29" r="1.4" fill="#fff"/><path d="M10 56h40" stroke="#7a5a3a" stroke-width="2"/>' },
    moon: { label: 'Lua', bg: '#262b4d', svg: '<path d="M36 14c-10 2-16 12-13 22 3 11 15 16 25 10-12 0-19-10-17-20 1-5 3-9 5-12z" fill="#f5d77a"/><g fill="#fff"><circle cx="16" cy="18" r="1.2"/><circle cx="46" cy="52" r="1.2"/><circle cx="14" cy="48" r="1"/><circle cx="48" cy="20" r="1"/></g>' },
    coffee: { label: 'Café', bg: '#f0e1cc', svg: '<path d="M15 32h26v9c0 8-6 13-13 13s-13-5-13-13z" fill="#8a5a3c"/><path d="M41 35c6 0 6 9 0 9" stroke="#8a5a3c" stroke-width="3" fill="none"/><path d="M22 26c-3-4 3-6 0-10M30 26c-3-4 3-6 0-10" stroke="#b08a6a" stroke-width="2" fill="none"/><path d="M12 58h34" stroke="#8a5a3c" stroke-width="2.5"/>' },
    mountain: { label: 'Montanhas', bg: '#dce9f2', svg: '<circle cx="42" cy="20" r="6" fill="#f2b84b"/><path d="M4 58l18-26 10 13 8-9 16 22z" fill="#4c7a5a"/><path d="M22 32l5 7-5-2-4 3z" fill="#fff"/>' },
    wave: { label: 'Mar', bg: '#e1f0f2', svg: '<path d="M4 38c6-6 12-6 18 0s12 6 18 0 12-6 16 0v22H4z" fill="#3d8fa6"/><path d="M4 46c6-6 12-6 18 0s12 6 18 0 12-6 16 0" stroke="#bfe3ea" stroke-width="2" fill="none"/><circle cx="18" cy="20" r="6" fill="#f2b84b"/>' },
    plane: { label: 'Aviãozinho', bg: '#f8e5cf', svg: '<path d="M10 34l40-16-12 34-8-12z" fill="#fff" stroke="#c4683a" stroke-width="2" stroke-linejoin="round"/><path d="M30 40l20-22" stroke="#c4683a" stroke-width="2"/><path d="M8 52c6 4 10-4 16 0" stroke="#c4683a" stroke-width="2" stroke-dasharray="3 3" fill="none"/>' },
    cat: { label: 'Gatinho', bg: '#efe2f1', svg: '<path d="M14 50V26l8 7h16l8-7v24c0 6-7 9-16 9s-16-3-16-9z" fill="#5a4a5e"/><circle cx="24" cy="41" r="2.2" fill="#f2d16b"/><circle cx="36" cy="41" r="2.2" fill="#f2d16b"/><path d="M28 47h4l-2 2z" fill="#f4a3b5"/>' },
    sun: { label: 'Sol', bg: '#fff0bf', svg: '<circle cx="30" cy="34" r="11" fill="#f0a531"/><g stroke="#f0a531" stroke-width="2.5" stroke-linecap="round"><path d="M30 13v6M30 49v6M9 34h6M45 34h6M15 19l4 4M41 45l4 4M45 19l-4 4M19 45l-4 4"/></g>' },
    rose: { label: 'Rosa', bg: '#fbe3e6', svg: '<path d="M30 36v22" stroke="#4f7a3a" stroke-width="2.5"/><path d="M30 49c-6-1-10-5-11-10 6 0 10 4 11 10zM30 45c6-1 9-4 10-9-6 0-9 4-10 9z" fill="#5c8a45"/><circle cx="30" cy="25" r="12" fill="#c7354a"/><path d="M30 17c-6 0-8 6-5 9 3 2 8 1 8-3 0-3-4-3-4 0M21 22c-1 7 3 12 9 12s10-5 9-11" stroke="#8e1f33" stroke-width="1.6" fill="none" stroke-linecap="round"/>' },
    star: { label: 'Estrela', bg: '#22305a', svg: '<path d="M30 12l5.3 11 12 1.6-8.8 8.3 2.2 12L30 39.2 19.3 45l2.2-12-8.8-8.3 12-1.6z" fill="#f6cf5a"/><g fill="#fff"><circle cx="12" cy="14" r="1.2"/><circle cx="50" cy="12" r="1"/><circle cx="48" cy="50" r="1.3"/><circle cx="12" cy="50" r="1"/></g><path d="M6 58c8-5 16-5 24-1s16 4 24-1" stroke="#7d8cc4" stroke-width="2" fill="none"/>' },
    cake: { label: 'Bolo', bg: '#fde9d6', svg: '<rect x="14" y="36" width="32" height="18" rx="2" fill="#f2a7b8"/><path d="M14 42c4 4 6-2 10 2s6-2 10 2 6-2 12 0" stroke="#fff" stroke-width="2.5" fill="none"/><rect x="18" y="28" width="24" height="9" rx="2" fill="#fbd3dc"/><path d="M30 28v-7" stroke="#6a8fd1" stroke-width="2.5"/><path d="M30 13c-3 3-3 6 0 7 3-1 3-4 0-7z" fill="#f2b84b"/><path d="M10 57h40" stroke="#b07a5a" stroke-width="2"/>' },
    beach: { label: 'Praia', bg: '#d8f0f7', svg: '<circle cx="46" cy="15" r="6" fill="#f7c64d"/><path d="M4 40c6-3 12-3 18 0s12 3 18 0 12-3 16 0v6H4z" fill="#3b9bb8"/><path d="M4 46h52v12H4z" fill="#f1d9a7"/><path d="M32 30v25" stroke="#7a5a3a" stroke-width="2"/><path d="M19 31a13 12 0 0 1 26 0z" fill="#e8546b"/><path d="M27 31a5 12 0 0 1 10 0z" fill="#fff" opacity=".85"/>' },
  };

  // Formas (adesivos geométricos preenchidos). vb = área do desenho, para a forma não ficar com sobra.
  const SHAPES = {
    circle: { label: 'Círculo', vb: '0 0 100 100', d: 'M50 4A46 46 0 1 1 49.9 4Z' },
    square: { label: 'Quadrado', vb: '0 0 100 100', d: 'M6 6H94V94H6Z' },
    rounded: { label: 'Arredondado', vb: '0 0 100 100', d: 'M26 6H74Q94 6 94 26V74Q94 94 74 94H26Q6 94 6 74V26Q6 6 26 6Z' },
    heart: { label: 'Coração', vb: '0 0 100 92', d: 'M50 88C20 67 4 51 6 31 8 13 30 4 50 24 70 4 92 13 94 31 96 51 80 67 50 88Z' },
    star: { label: 'Estrela', vb: '0 0 100 96', d: 'M50 4 62 36 96 38 69 59 79 92 50 73 21 92 31 59 4 38 38 36Z' },
    blob: { label: 'Mancha', vb: '0 0 100 100', d: 'M54 6C76 6 96 22 92 46 89 66 96 84 74 92 52 100 30 92 16 78 2 64 4 40 16 24 26 10 38 6 54 6Z' },
    arrow: { label: 'Seta', vb: '0 0 100 60', d: 'M4 21H60V5L96 30 60 55V39H4Z' },
    bubble: { label: 'Balão de fala', vb: '0 0 100 90', d: 'M50 4C76 4 96 18 96 38 96 58 76 72 50 72 44 72 38 71 33 70L14 86 20 66C10 59 4 49 4 38 4 18 24 4 50 4Z' },
    ribbon: { label: 'Faixa', vb: '0 0 100 46', d: 'M16 6H84V36H16ZM16 12H2L10 25 2 40H16ZM84 12H98L90 25 98 40H84Z' },
    badge: { label: 'Medalha', vb: '0 0 100 100', d: (function () {
      const pts = [];
      for (let i = 0; i < 32; i++) {
        const a = (Math.PI * 2 * i) / 32 - Math.PI / 2;
        const r = i % 2 ? 41 : 47;
        pts.push((50 + r * Math.cos(a)).toFixed(1) + ' ' + (50 + r * Math.sin(a)).toFixed(1));
      }
      return 'M' + pts.join(' ') + 'Z';
    })() },
    cloud: { label: 'Nuvem', vb: '0 0 100 70', d: 'M24 64C10 64 4 54 6 46 8 38 16 34 24 36 24 20 40 10 54 14 64 6 82 10 84 26 96 28 98 46 92 56 88 62 82 64 76 64Z' },
    sparkle4: { label: 'Brilho', vb: '0 0 100 100', d: 'M50 2C54 36 64 46 98 50 64 54 54 64 50 98 46 64 36 54 2 50 36 46 46 36 50 2Z' },
  };
  const SHAPE_COLORS = ['#f4a3b5', '#f7c873', '#a8dcc0', '#9cc9f0', '#c9b5ee', '#e8546b', '#3b3340', '#ffffff'];

  // Animação, contorno e filtro dos adesivos (espelham STICKER_ANIMS, STICKER_OUTLINES e IMAGE_FILTERS)
  const STICKER_ANIMS = { '': 'Parado', float: 'Flutuar', pulse: 'Pulsar', wiggle: 'Balançar', spin: 'Girar', sparkle: 'Brilhar', bounce: 'Pular' };
  const STICKER_OUTLINES = { '': 'Nenhum', white: 'Recorte branco', shadow: 'Sombra', both: 'Recorte + sombra' };
  const IMAGE_FILTERS = {
    '': 'Original', pb: 'P&B', sepia: 'Sépia', vintage: 'Vintage', quente: 'Quente',
    frio: 'Frio', desbotado: 'Desbotado', contraste: 'Contraste', sonho: 'Sonho',
  };
  // Efeitos para trechos de texto (classes aceitas pelo servidor em <span>, ver TEXT_FX_CLASSES)
  const TEXT_FX = {
    'fx-hl-yellow': 'Marca-texto amarelo', 'fx-hl-pink': 'Marca-texto rosa', 'fx-hl-green': 'Marca-texto verde', 'fx-hl-blue': 'Marca-texto azul',
    'fx-wavy': 'Sublinhado ondulado', 'fx-glow': 'Brilho', 'fx-outline': 'Contorno',
    'fx-gradient-sunset': 'Degradê pôr do sol', 'fx-gradient-ocean': 'Degradê oceano', 'fx-gradient-rainbow': 'Degradê arco-íris', 'fx-shadow': 'Sombra suave',
  };
  // Espaçamento de letras e de linhas por bloco, e a "caixa" de qualquer bloco (espelham BLOCK_SPACING, BLOCK_LEADING e BOX_* do servidor)
  const SPACINGS = { '': 'Normal', tight: 'Junto', wide: 'Solto', wider: 'Bem solto' };
  const LEADINGS = { '': 'Normal', tight: 'Junto', loose: 'Arejado', looser: 'Bem arejado' };
  const BOX_BORDERS = { none: 'Sem borda', solid: 'Linha', dashed: 'Tracejada', dotted: 'Pontilhada', double: 'Dupla' };
  const BOX_RADII = { 0: 'Reto', sm: 'Suave', md: 'Redondo', round: 'Bem redondo' };
  const BOX_PADS = { none: 'Nenhum', sm: 'Pouco', md: 'Bastante' };
  const BOX_WIDTHS = { full: 'Inteira', w75: '3/4', w50: 'Metade' };
  const BOX_POSITIONS = { center: 'Centro', left: 'Esquerda', right: 'Direita' };

  // ---------- Tela livre (espelham PAPER_FORMATS, IMAGE_MASKS e DRAW_BRUSHES em app/content.php) ----------
  // Formato do papel: largura de projeto (--dw) e altura mínima proporcional (--fmt-h, em cqw, no CSS)
  const FORMATS = {
    '': { label: 'Carta', hint: 'Cresce com o texto' },
    square: { label: 'Quadrado', hint: '1:1', ratio: 1 },
    postcard: { label: 'Cartão-postal', hint: 'Deitado, 3:2', ratio: 2 / 3 },
    note: { label: 'Bilhete', hint: 'Pequeno e estreito', ratio: 1.25 },
    story: { label: 'Story', hint: 'Em pé, 9:16', ratio: 16 / 9 },
  };
  // Molduras e recortes das fotos soltas. path: recorte em 0..100 (o mesmo desenho vale para a tela e para a imagem salva)
  const MASKS = {
    '': { label: 'Original' },
    circle: { label: 'Círculo', crop: 1 },
    rounded: { label: 'Cantos redondos' },
    heart: { label: 'Coração', crop: 1, path: 'M50 95C18 72 2 55 4 33 6 13 30 3 50 25 70 3 94 13 96 33 98 55 82 72 50 95Z' },
    star: { label: 'Estrela', crop: 1, path: 'M50 2 62 36 98 37 69 59 80 96 50 75 20 96 31 59 2 37 38 36Z' },
    arch: { label: 'Arco', crop: 1.25 },
    blob: { label: 'Mancha', crop: 1, path: 'M54 4C77 4 97 21 93 46 90 66 97 85 74 93 52 101 29 93 15 79 1 64 3 39 15 23 25 9 38 4 54 4Z' },
    polaroid: { label: 'Polaroid', crop: 1 },
    stamp: { label: 'Selo' },
  };
  const BRUSHES = { '': 'Caneta', marker: 'Marcador', pencil: 'Lápis', chalk: 'Giz', neon: 'Neon' };

  function maskUrl(d) {
    return 'url("data:image/svg+xml,' + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'><path d='" + d + "'/></svg>") + '")';
  }

  const EFFECTS = { none: 'Nenhum', hearts: 'Corações', confetti: 'Confete', petals: 'Pétalas', stars: 'Estrelas', snow: 'Neve', emoji: 'Chuva do seu jeito' };
  const EFFECT_EMOJIS = ['💖', '✨', '🌸']; // chuva do seu jeito sem emojis escolhidos
  const GALLERY_LAYOUTS = { scatter: 'Espalhadas', grid: 'Grade', strip: 'Filme' };

  const PAPER_COLORS = ['#fffdf6', '#ffffff', '#fdf1e6', '#fce8ec', '#eaf4ec', '#e8f0fb', '#f3ecfb', '#fff6cc', '#2d2a35'];
  const INK_COLORS = ['#3b3340', '#1f2a44', '#7a2e3a', '#2f5d50', '#5b3f8c', '#8a5a2b', '#000000', '#fdf6e9'];
  const ACCENT_COLORS = ['#e86a7e', '#f29e4c', '#e8c547', '#6bbf8a', '#5aa9e6', '#9b7be0', '#d16ba5', '#3b3340'];
  const SIZE_MUL = { '': 1, sm: 0.85, md: 1, lg: 1.3, xl: 1.75 };

  function uid() {
    return 'b' + Math.random().toString(36).slice(2, 10);
  }

  /** Ícone do arquivo assets/icons.svg */
  function icon(name, cls) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'ic' + (cls ? ' ' + cls : ''));
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(ns, 'use');
    use.setAttribute('href', 'assets/icons.svg#' + name);
    svg.appendChild(use);
    return svg;
  }

  function mediaUrl(src) {
    return 'media.php?f=' + encodeURIComponent(src);
  }

  function el(tag, className, attrs) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === null || v === undefined || v === false) continue;
        if (k === 'text') node.textContent = v;
        else if (k === 'html') node.innerHTML = v;
        else node.setAttribute(k, v === true ? '' : v);
      }
    }
    return node;
  }

  function parseMusicUrl(url) {
    url = (url || '').trim();
    let m = url.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/);
    if (m) return { provider: 'youtube', kind: 'video', mid: m[1] };
    m = url.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?(track|album|playlist|episode)\/([A-Za-z0-9]{22})/);
    if (m) return { provider: 'spotify', kind: m[1], mid: m[2] };
    m = url.match(/^spotify:(track|album|playlist|episode):([A-Za-z0-9]{22})$/);
    if (m) return { provider: 'spotify', kind: m[1], mid: m[2] };
    return null;
  }

  function musicEmbed(b) {
    if (!b.provider || !b.mid) return null;
    const wrap = el('div', 'music-embed music-' + b.provider);
    const src = b.provider === 'youtube'
      ? 'https://www.youtube-nocookie.com/embed/' + b.mid + '?rel=0'
      : 'https://open.spotify.com/embed/' + b.kind + '/' + b.mid;
    wrap.appendChild(el('iframe', '', {
      src, loading: 'lazy', title: 'Música',
      allow: 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture',
      allowfullscreen: true, frameborder: '0',
      // O YouTube recusa vídeos embutidos sem saber de qual site vêm (erro 153).
      // Só o endereço do site é enviado, nunca a página da carta.
      referrerpolicy: 'strict-origin-when-cross-origin',
    }));
    if (b.provider === 'youtube') {
      const link = el('a', 'music-open', { href: 'https://www.youtube.com/watch?v=' + b.mid, target: '_blank', rel: 'noopener', text: 'Abrir no YouTube' });
      wrap.appendChild(link);
    }
    return wrap;
  }

  /** Aplica estilos de papel e cena. */
  function applyPaper(scene, paper, p) {
    if (scene) {
      const sceneKey = p.scene === 'image' && !p.sceneImage ? 'plain' : (p.scene || 'desk');
      scene.className = scene.className.replace(/\bscene-\S+/g, '').trim() + ' scene-' + sceneKey;
      if (sceneKey === 'image') {
        // endereço absoluto: dentro de uma variável CSS, url() relativo seria resolvido a partir do arquivo .css
        scene.style.setProperty('--scene-img', 'url("' + new URL(mediaUrl(p.sceneImage), location.href).href + '")');
        scene.style.setProperty('--scene-blur', (p.sceneBlur || 0) + 'px');
        scene.style.setProperty('--scene-dim', p.sceneDim || 0);
      } else {
        scene.style.removeProperty('--scene-img');
      }
    }
    const usesImage = p.style === 'image' && p.image;
    paper.className = 'paper paper-' + (usesImage ? 'image' : (p.style === 'image' ? 'plain' : (p.style || 'lined')))
      + ' border-' + (p.border || 'none') + ' size-' + (p.size || 'md') + (p.layout === 2 ? ' layout-2' : '')
      + (paper.dataset.fluid === '1' ? ' paper-fluid' : '')
      + ((usesImage ? p.veilDark : isDark(p.color)) ? ' paper-dark' : '')
      + (p.format && FORMATS[p.format] ? ' has-fmt fmt-' + p.format : '');
    const font = FONTS[p.font] || FONTS.caveat;
    paper.style.setProperty('--paper', p.color || '#fffdf6');
    paper.style.setProperty('--ink', p.ink || '#3b3340');
    paper.style.setProperty('--font', font.css);
    paper.style.setProperty('--font-scale', font.scale);
    if (p.style === 'gradient') paper.style.setProperty('--paper2', p.color2 || '#f6d6e0');
    else paper.style.removeProperty('--paper2');
    if (usesImage) {
      // Véu por cima da imagem, para o texto continuar legível
      const v = p.veil === undefined ? 0.35 : p.veil;
      const c = p.veilDark ? 'rgba(18, 14, 12, ' + v + ')' : 'rgba(255, 253, 248, ' + v + ')';
      const tile = p.imageFit === 'tile';
      paper.style.backgroundImage = 'linear-gradient(' + c + ', ' + c + '), url("' + mediaUrl(p.image) + '")';
      paper.style.backgroundSize = '100% 100%, ' + (tile ? '360px auto' : (p.imageFit === 'contain' ? 'contain' : 'cover'));
      paper.style.backgroundRepeat = 'no-repeat, ' + (tile ? 'repeat' : 'no-repeat');
      paper.style.backgroundPosition = 'center, center';
    } else {
      paper.style.backgroundImage = '';
      paper.style.backgroundSize = '';
      paper.style.backgroundRepeat = '';
      paper.style.backgroundPosition = '';
    }
  }

  function isDark(hex) {
    if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return false;
    const n = parseInt(hex.slice(1), 16);
    const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    return lum < 0.45;
  }

  function isBlank(html) {
    return !html || html.replace(/<br\s*\/?>|&nbsp;|\s/g, '') === '';
  }

  /** Estilos comuns do bloco (alinhamento, fonte, tamanho, cor). */
  function applyBlockStyle(node, b, paper) {
    node.dataset.id = b.id;
    node.classList.add('lb', 'lb-' + b.type);
    node.style.textAlign = b.align && b.align !== 'left' ? b.align : '';
    let mul = SIZE_MUL[b.size || ''] || 1;
    if (b.font && FONTS[b.font]) {
      node.style.fontFamily = FONTS[b.font].css;
      mul *= FONTS[b.font].scale / (FONTS[paper.font] || FONTS.caveat).scale;
    } else {
      node.style.fontFamily = '';
    }
    node.style.fontSize = mul !== 1 ? mul.toFixed(3) + 'em' : '';
    node.style.color = b.color || '';
    // filtro de foto (blocos de foto, foto e texto e galeria)
    Array.from(node.classList).forEach((c) => { if (c.startsWith('imgf-')) node.classList.remove(c); });
    if (b.filter && IMAGE_FILTERS[b.filter]) node.classList.add('imgf-' + b.filter);
    applyBlockExtras(node, b);
  }

  /**
   * Opcionais de qualquer bloco: espaçamento de letras/linhas e a "caixa" (fundo, borda, cantos, respiro,
   * sombra, inclinação, largura). Medidas em em/--u, então a carta muda só de escala em qualquer tela.
   * Sem esses campos, nada muda no bloco (cartas antigas ficam idênticas).
   */
  function applyBlockExtras(node, b) {
    Array.from(node.classList).forEach((c) => { if (/^(ls-|lh-|box-|has-box$)/.test(c)) node.classList.remove(c); });
    if (b.spacing && SPACINGS[b.spacing]) node.classList.add('ls-' + b.spacing);
    if (b.leading && LEADINGS[b.leading]) node.classList.add('lh-' + b.leading);
    // trechos com outra letra (ff-*) se ajustam ao tamanho da letra do bloco
    if (b.font && FONTS[b.font]) node.style.setProperty('--block-fs', FONTS[b.font].scale);
    else node.style.removeProperty('--block-fs');
    const box = b.box;
    if (!box || typeof box !== 'object') {
      if (node.style.rotate) node.style.rotate = '';
      node.style.removeProperty('--box-bg');
      node.style.removeProperty('--box-bc');
      return;
    }
    node.classList.add('has-box');
    if (/^#[0-9a-f]{6}$/i.test(box.bg || '')) node.style.setProperty('--box-bg', box.bg);
    else node.style.removeProperty('--box-bg');
    if (box.border && box.border !== 'none' && BOX_BORDERS[box.border]) {
      node.classList.add('box-bd-' + box.border);
      node.style.setProperty('--box-bc', /^#[0-9a-f]{6}$/i.test(box.bc || '') ? box.bc : '#3b3340');
    } else node.style.removeProperty('--box-bc');
    if (box.radius && box.radius !== '0' && BOX_RADII[box.radius]) node.classList.add('box-r-' + box.radius);
    if (box.pad && box.pad !== 'none' && BOX_PADS[box.pad]) node.classList.add('box-p-' + box.pad);
    if (box.shadow) node.classList.add('box-shadow');
    if (box.width && box.width !== 'full' && BOX_WIDTHS[box.width]) {
      node.classList.add('box-' + box.width, 'box-pos-' + (BOX_POSITIONS[box.pos] ? box.pos : 'center'));
    }
    const tilt = Math.max(-4, Math.min(4, Math.round(Number(box.tilt) || 0)));
    // "rotate" (e não transform): convive com a animação de entrada dos blocos e não muda a altura
    node.style.rotate = tilt ? tilt + 'deg' : '';
  }

  /**
   * Renderiza um bloco para leitura.
   * ctx (opcional): { interaction, onInteract(blockId, value) → Promise, sender, otherName }
   * — usado pelos blocos interativos (pergunta, vale).
   */
  function renderBlock(b, paper, ctx) {
    const node = el('div');
    applyBlockStyle(node, b, paper);
    switch (b.type) {
      case 'heading':
        node.appendChild(el('h' + (b.level || 1), 'lb-text', { html: b.html || '' }));
        break;
      case 'paragraph':
        node.appendChild(el('p', 'lb-text', { html: b.html || '' }));
        break;
      case 'quote':
        node.appendChild(el('blockquote', 'lb-text', { html: b.html || '' }));
        break;
      case 'list': {
        const list = el(b.style === 'number' ? 'ol' : 'ul', 'lb-list');
        (b.items || []).filter((item) => !isBlank(item)).forEach((item) => list.appendChild(el('li', '', { html: item })));
        node.appendChild(list);
        break;
      }
      case 'checklist': {
        const list = el('ul', 'lb-checklist');
        (b.items || []).filter((item) => !isBlank(item.html)).forEach((item) => {
          const li = el('li', item.checked ? 'checked' : '');
          li.appendChild(el('span', 'check-box', { 'aria-hidden': 'true', text: item.checked ? '✓' : '' }));
          li.appendChild(el('span', 'check-text', { html: item.html }));
          list.appendChild(li);
        });
        node.appendChild(list);
        break;
      }
      case 'callout': {
        const box = el('div', 'callout');
        box.style.setProperty('--callout', b.bg || '#fde8e4');
        box.appendChild(el('span', 'callout-icon', { text: b.emoji || '💌' }));
        box.appendChild(el('div', 'lb-text', { html: b.html || '' }));
        node.appendChild(box);
        break;
      }
      case 'image':
        node.appendChild(renderImageFigure(b));
        break;
      case 'divider':
        node.appendChild(renderDivider(b));
        break;
      case 'secret': {
        const box = el('div', 'secret');
        const btn = el('button', 'secret-cover', { type: 'button' });
        btn.appendChild(el('span', 'secret-lock', { text: '🔒', 'aria-hidden': 'true' }));
        btn.appendChild(el('span', '', { text: b.label || 'Toque para revelar um segredo' }));
        btn.addEventListener('click', () => box.classList.add('revealed'));
        box.appendChild(btn);
        box.appendChild(el('div', 'secret-content lb-text', { html: b.html || '' }));
        node.appendChild(box);
        break;
      }
      case 'music': {
        const embed = musicEmbed(b);
        if (embed) node.appendChild(embed);
        break;
      }
      case 'signature':
        node.appendChild(renderSignature(b));
        break;
      case 'gallery':
        node.appendChild(renderGallery(b));
        break;
      case 'phototext': {
        const row = el('div', 'phototext side-' + (b.side || 'left'));
        row.appendChild(renderImageFigure({ src: b.src, frame: b.frame || 'polaroid', width: 'lg', tilt: b.side === 'right' ? 2 : -2, caption: '' }));
        row.appendChild(el('div', 'phototext-text lb-text', { html: b.html || '' }));
        node.appendChild(row);
        break;
      }
      case 'audio':
        if (b.src) node.appendChild(renderAudio(b));
        break;
      case 'scratch':
        node.appendChild(renderScratch(b, true));
        break;
      case 'pagebreak':
        break;
      case 'spacer':
        node.style.height = 'calc(' + (b.height || 40) + ' * var(--u))';
        break;
      default:
        if (EXTRA_RENDERERS[b.type]) node.appendChild(EXTRA_RENDERERS[b.type](b, ctx || {}));
    }
    return node;
  }

  // ---------- Blocos: sanfona, linha do tempo, contador, pergunta, vale, poema, lugar, colunas, botão ----------
  // Cada um recebe (b, ctx). No editor, ctx.editing = true e ctx.field cria os campos editáveis:
  // a estrutura (e o tamanho) do bloco é a mesma na leitura e na edição.

  /** Põe um campo de texto: na leitura, só se tiver conteúdo (ou se always); na edição, sempre. */
  function putField(ctx, parent, tag, cls, value, kind, placeholder, onChange, always) {
    let node;
    if (ctx.editing && ctx.field) node = ctx.field(tag, cls, value, kind, placeholder, onChange);
    else if (!always && (kind === 'html' ? isBlank(value) : !String(value || '').trim())) return null;
    else node = el(tag, cls, kind === 'html' ? { html: value || '' } : { text: value || '' });
    parent.appendChild(node);
    return node;
  }

  const PREVIEW_HINT = 'Quem receber vai poder responder';

  /** Quem está vendo um bloco interativo: 'edit', 'sender' (só lê o resultado), 'recipient' ou 'preview'. */
  function interactiveState(ctx) {
    if (ctx.editing) return 'edit';
    if (ctx.sender) return 'sender';
    return ctx.onInteract ? 'recipient' : 'preview';
  }

  function fmtShortDate(iso) {
    const d = iso ? new Date(iso) : new Date();
    if (isNaN(d)) return '';
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  }

  function renderToggle(b, ctx) {
    const box = el('div', 'toggle');
    const chev = el('span', 'toggle-chev', { 'aria-hidden': 'true' });
    chev.appendChild(icon('chevron-down'));
    if (ctx.editing) {
      box.classList.add('editing', 'open');
      const head = el('div', 'toggle-head');
      head.appendChild(chev);
      putField(ctx, head, 'span', 'toggle-title', b.title, 'plain', 'Título da sanfona', (v) => { b.title = v; });
      box.appendChild(head);
      putField(ctx, box, 'div', 'toggle-body toggle-inner lb-text', b.html, 'html', 'O que aparece quando abrir…', (v) => { b.html = v; });
      return box;
    }
    const bodyId = 'tg-' + b.id + '-' + Math.random().toString(36).slice(2, 6);
    const head = el('button', 'toggle-head', { type: 'button', 'aria-expanded': 'false', 'aria-controls': bodyId });
    head.append(chev, el('span', 'toggle-title', { text: b.title || 'Toque para abrir' }));
    const body = el('div', 'toggle-body', { id: bodyId, hidden: true });
    body.appendChild(el('div', 'toggle-inner lb-text', { html: b.html || '' }));
    box.append(head, body);
    let anim = 0;
    const quiet = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.reduceMotion === '1';
    head.addEventListener('click', () => {
      const open = head.getAttribute('aria-expanded') !== 'true';
      head.setAttribute('aria-expanded', String(open));
      box.classList.toggle('open', open);
      clearTimeout(anim);
      if (quiet()) {
        body.hidden = !open;
        body.style.height = '';
        return;
      }
      body.hidden = false;
      const full = body.scrollHeight;
      body.style.height = (open ? 0 : full) + 'px';
      void body.offsetHeight; // aplica a altura inicial antes da transição
      body.style.height = (open ? full : 0) + 'px';
      anim = setTimeout(() => {
        body.style.height = '';
        if (!open) body.hidden = true;
      }, 320);
    });
    return box;
  }

  function renderTimeline(b, ctx) {
    const list = el('ol', 'story-line');
    (b.items || []).forEach((it, i) => {
      const li = el('li', 'story-item');
      li.appendChild(el('span', 'story-dot', { 'aria-hidden': 'true' }));
      putField(ctx, li, 'div', 'story-date', it.date, 'plain', 'Quando? (ex.: março de 2021)', (v) => { it.date = v; });
      putField(ctx, li, 'div', 'story-title', it.title, 'plain', 'O que aconteceu', (v) => { it.title = v; });
      putField(ctx, li, 'div', 'story-text lb-text', it.html, 'html', 'Conte um pouco…', (v) => { it.html = v; });
      if (ctx.itemTools) ctx.itemTools(li, i);
      list.appendChild(li);
    });
    return list;
  }

  const COUNTER_UNITS = {
    anos: ['ano', 'anos'], meses: ['mês', 'meses'], dias: ['dia', 'dias'],
    horas: ['hora', 'horas'], min: ['minuto', 'minutos'], seg: ['segundo', 'segundos'],
  };
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  function parseCounterDate(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(s || '');
    if (!m) return null;
    const d = new Date(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0);
    return isNaN(d) ? null : d;
  }

  function fmtCounterDate(s) {
    const d = parseCounterDate(s);
    if (!d) return '';
    let t = d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear();
    if (s.indexOf('T') > 0) t += ' às ' + String(d.getHours()).padStart(2, '0') + 'h' + String(d.getMinutes()).padStart(2, '0');
    return t;
  }

  /** Partes do contador: desde (anos, meses, dias) ou até (dias, horas, minutos, segundos). */
  function counterParts(b, now) {
    const d = parseCounterDate(b.date);
    if (!d) return null;
    if (b.mode === 'until') {
      const s = Math.max(0, Math.floor((d - now) / 1000));
      return { done: s === 0, parts: [[Math.floor(s / 86400), 'dias'], [Math.floor((s % 86400) / 3600), 'horas'], [Math.floor((s % 3600) / 60), 'min'], [s % 60, 'seg']] };
    }
    if (now < d) return { parts: [[0, 'anos'], [0, 'meses'], [0, 'dias']] };
    // meses inteiros desde a data (31/jan + 1 mês = 28/fev; 29/fev + 1 ano = 28/fev), depois os dias que sobram
    const plusMonths = (k) => {
      const last = new Date(d.getFullYear(), d.getMonth() + k + 1, 0).getDate();
      return new Date(d.getFullYear(), d.getMonth() + k, Math.min(d.getDate(), last), d.getHours(), d.getMinutes());
    };
    let months = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth();
    let anchor = plusMonths(months);
    if (anchor > now) anchor = plusMonths(--months);
    let day = Math.round((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())) / 86400000);
    if (now.getHours() * 60 + now.getMinutes() < anchor.getHours() * 60 + anchor.getMinutes()) day--;
    return { parts: [[Math.floor(months / 12), 'anos'], [months % 12, 'meses'], [day, 'dias']] };
  }

  function renderCounter(b, ctx) {
    const box = el('div', 'counter counter-' + (b.mode === 'until' ? 'until' : 'since'));
    putField(ctx, box, 'p', 'counter-label', b.label, 'plain', b.mode === 'until' ? 'Faltam' : 'Juntos há', (v) => { b.label = v; });
    const nums = el('div', 'counter-nums');
    const foot = el('p', 'counter-date');
    box.append(nums, foot);
    let shape = '';
    const paint = () => {
      const r = counterParts(b, new Date());
      const key = !r ? 'none' : r.done ? 'done' : r.parts.map((p) => p[1]).join();
      if (key !== shape) {
        shape = key;
        box.classList.toggle('counter-done', key === 'done');
        if (!r) nums.replaceChildren(el('span', 'counter-empty', { text: ctx.editing ? 'Escolha a data no menu do bloco' : '—' }));
        else if (r.done) nums.replaceChildren(el('span', 'counter-party', { text: 'Chegou o dia! 🎉' }));
        else {
          nums.replaceChildren(...r.parts.map(() => {
            const cell = el('span', 'counter-cell');
            cell.append(el('b'), el('small'));
            return cell;
          }));
        }
      }
      if (r && !r.done) {
        r.parts.forEach(([n, unit], i) => {
          const cell = nums.children[i];
          const txt = String(n);
          if (cell.firstChild.textContent !== txt) cell.firstChild.textContent = txt;
          cell.lastChild.textContent = n === 1 ? COUNTER_UNITS[unit][0] : COUNTER_UNITS[unit][1];
        });
      }
      foot.textContent = r ? (b.mode === 'until' ? 'até ' : 'desde ') + fmtCounterDate(b.date) : '';
    };
    paint();
    // Atualiza a cada segundo só enquanto aparece na tela
    if (window.IntersectionObserver) {
      let timer = 0;
      const stop = () => {
        clearInterval(timer);
        timer = 0;
        box.dataset.live = '0';
      };
      const io = new IntersectionObserver((entries) => {
        const visible = entries[entries.length - 1].isIntersecting;
        if (visible && !timer) {
          paint();
          box.dataset.live = '1';
          timer = setInterval(() => {
            if (!box.isConnected) {
              stop();
              io.disconnect();
              return;
            }
            paint();
          }, 1000);
        } else if (!visible && timer) stop();
      });
      io.observe(box);
    }
    return box;
  }

  function renderQuiz(b, ctx) {
    const box = el('div', 'quiz');
    const mode = interactiveState(ctx);
    putField(ctx, box, 'p', 'quiz-q', b.question, 'plain', 'Sua pergunta…', (v) => { b.question = v; }, true);
    const list = el('div', 'quiz-options', { role: 'group', 'aria-label': b.question || 'Opções' });
    const foot = el('p', 'quiz-foot', { 'aria-live': 'polite' });
    const LETTERS = 'ABCD';
    const options = b.options || [];
    const opts = options.map((o, i) => {
      const btn = el(mode === 'edit' ? 'div' : 'button', 'quiz-opt', mode === 'edit' ? null : { type: 'button' });
      btn.appendChild(el('span', 'quiz-letter', { text: LETTERS[i], 'aria-hidden': 'true', contenteditable: mode === 'edit' ? 'false' : null }));
      putField(ctx, btn, 'span', 'quiz-text', o, 'plain', 'Opção ' + LETTERS[i], (v) => { options[i] = v; }, true);
      if (mode === 'edit' && b.answer === i) {
        btn.classList.add('is-answer');
        btn.appendChild(el('span', 'quiz-badge', { text: '✓ certa', contenteditable: 'false' }));
      }
      list.appendChild(btn);
      return btn;
    });
    box.append(list, foot);

    const chosen = ctx.interaction && /^\d$/.test(ctx.interaction.value) ? Number(ctx.interaction.value) : -1;
    const showResult = (choice) => {
      box.classList.add('answered');
      opts.forEach((btn, i) => {
        btn.disabled = true;
        btn.classList.toggle('chosen', i === choice);
        btn.classList.toggle('correct', b.answer >= 0 && i === b.answer);
        btn.classList.toggle('wrong', b.answer >= 0 && i === choice && choice !== b.answer);
        if (i === choice) btn.setAttribute('aria-pressed', 'true');
      });
      if (mode === 'sender') {
        const verdict = b.answer < 0 ? '' : choice === b.answer ? ' ✓' : ' ✗';
        foot.textContent = (ctx.otherName || 'Quem recebeu') + ' respondeu: ' + (options[choice] || LETTERS[choice]) + verdict;
      } else if (b.answer < 0) {
        foot.textContent = b.right || 'Resposta guardada! 💌';
      } else {
        foot.textContent = choice === b.answer ? (b.right || 'Acertou! 🎉') : (b.wrong || 'Quase! A resposta certa está marcada.');
      }
      foot.classList.toggle('is-right', b.answer < 0 || choice === b.answer);
    };

    if (mode === 'edit' || mode === 'preview') {
      foot.textContent = PREVIEW_HINT;
      foot.classList.add('quiz-hint');
      if (mode === 'edit') foot.contentEditable = 'false';
      else opts.forEach((btn) => { btn.disabled = true; });
    } else if (chosen >= 0 && chosen < options.length) {
      showResult(chosen);
    } else if (mode === 'sender') {
      opts.forEach((btn) => { btn.disabled = true; });
      foot.textContent = 'Ainda sem resposta.';
      foot.classList.add('quiz-hint');
    } else {
      foot.textContent = 'Toque numa opção';
      foot.classList.add('quiz-hint');
      let busy = false;
      opts.forEach((btn, i) => btn.addEventListener('click', async () => {
        if (busy || box.classList.contains('answered')) return;
        busy = true;
        box.classList.add('busy');
        try {
          await ctx.onInteract(b.id, String(i));
          foot.classList.remove('quiz-hint');
          showResult(i);
        } catch (err) {
          foot.textContent = (err && err.message) || 'Não deu para guardar sua resposta. Tente de novo.';
        } finally {
          busy = false;
          box.classList.remove('busy');
        }
      }));
    }
    return box;
  }

  function renderCoupon(b, ctx) {
    const wrap = el('div', 'coupon');
    wrap.style.setProperty('--coupon', b.bg || '#f6d7c3');
    const ticket = el('div', 'coupon-ticket');
    const stub = el('div', 'coupon-stub');
    stub.appendChild(el(ctx.editing ? 'button' : 'span', 'coupon-emoji', ctx.editing
      ? { type: 'button', contenteditable: 'false', title: 'Trocar emoji', text: b.emoji || '🎟️' }
      : { text: b.emoji || '🎟️', 'aria-hidden': 'true' }));
    const main = el('div', 'coupon-main');
    main.appendChild(el('span', 'coupon-kicker', { text: 'Vale', contenteditable: ctx.editing ? 'false' : null }));
    putField(ctx, main, 'p', 'coupon-title', b.title, 'plain', 'Vale um abraço apertado', (v) => { b.title = v; }, true);
    putField(ctx, main, 'p', 'coupon-details', b.details, 'plain', 'Detalhes (opcional): validade, regras…', (v) => { b.details = v; });
    const foot = el('div', 'coupon-foot', { 'aria-live': 'polite', contenteditable: ctx.editing ? 'false' : null });
    main.appendChild(foot);
    ticket.append(stub, main);
    wrap.appendChild(ticket);

    const mode = interactiveState(ctx);
    const used = ctx.interaction && ctx.interaction.value === 'used' ? ctx.interaction : null;
    const markUsed = (at) => {
      wrap.classList.add('used');
      const when = fmtShortDate(at);
      if (!wrap.querySelector('.coupon-stamp')) wrap.appendChild(el('span', 'coupon-stamp', { text: 'Usado em ' + when, 'aria-hidden': 'true' }));
      foot.replaceChildren(el('span', 'coupon-note', {
        text: mode === 'sender' ? (ctx.otherName || 'Quem recebeu') + ' usou em ' + when : 'Vale usado em ' + when + ' 💛',
      }));
    };
    if (mode === 'edit' || mode === 'preview') {
      foot.appendChild(el('span', 'coupon-note', { text: 'Quem receber vai poder usar o vale' }));
    } else if (used) {
      markUsed(used.at);
    } else if (mode === 'sender') {
      foot.appendChild(el('span', 'coupon-note', { text: 'Ainda não foi usado' }));
    } else {
      const ask = () => {
        const use = el('button', 'coupon-btn', { type: 'button', text: 'Usar vale' });
        use.addEventListener('click', () => {
          const q = el('span', 'coupon-note', { text: 'Usar agora?' });
          const yes = el('button', 'coupon-btn', { type: 'button', text: 'Sim, usar' });
          const no = el('button', 'coupon-btn coupon-btn-ghost', { type: 'button', text: 'Agora não' });
          no.addEventListener('click', () => {
            ask();
            foot.querySelector('button').focus();
          });
          yes.addEventListener('click', async () => {
            yes.disabled = true;
            no.disabled = true;
            try {
              const res = await ctx.onInteract(b.id, 'used');
              markUsed(res && res.at);
            } catch (err) {
              foot.replaceChildren(el('span', 'coupon-note', { text: (err && err.message) || 'Não deu para usar agora. Tente de novo.' }));
              setTimeout(ask, 2500);
            }
          });
          foot.replaceChildren(q, yes, no);
          yes.focus();
        });
        foot.replaceChildren(use);
      };
      ask();
    }
    return wrap;
  }

  function renderPoem(b, ctx) {
    const box = el('div', 'poem');
    putField(ctx, box, 'div', 'poem-text lb-text', b.html, 'html', 'Escreva seu poema…', (v) => { b.html = v; }, true);
    putField(ctx, box, 'p', 'poem-author', b.author, 'plain', 'Autor (opcional)', (v) => { b.author = v; });
    return box;
  }

  function renderPlace(b, ctx) {
    const box = el('div', 'place');
    const card = el('div', 'place-card');
    card.appendChild(el(ctx.editing ? 'button' : 'span', 'place-emoji', ctx.editing
      ? { type: 'button', contenteditable: 'false', title: 'Trocar emoji', text: b.emoji || '📍' }
      : { text: b.emoji || '📍', 'aria-hidden': 'true' }));
    putField(ctx, card, 'p', 'place-name', b.name, 'plain', 'Nome do lugar', (v) => { b.name = v; }, true);
    putField(ctx, card, 'p', 'place-caption', b.caption, 'plain', 'Uma lembrança (opcional)', (v) => { b.caption = v; });
    putField(ctx, card, 'p', 'place-date', b.date, 'plain', 'Data (opcional)', (v) => { b.date = v; });
    box.appendChild(card);
    return box;
  }

  function renderColumns(b, ctx) {
    const row = el('div', 'columns');
    putField(ctx, row, 'div', 'col lb-text', b.left, 'html', 'Coluna da esquerda…', (v) => { b.left = v; }, true);
    putField(ctx, row, 'div', 'col lb-text', b.right, 'html', 'Coluna da direita…', (v) => { b.right = v; }, true);
    return row;
  }

  function renderButton(b, ctx) {
    const wrap = el('div', 'lb-btn-wrap');
    if (ctx.editing) {
      const pill = el('span', 'lb-button' + (b.url ? '' : ' no-url'));
      putField(ctx, pill, 'span', 'lb-button-label', b.label, 'plain', 'Texto do botão', (v) => { b.label = v; });
      pill.appendChild(icon('link', 'lb-button-ic'));
      wrap.appendChild(pill);
      return wrap;
    }
    const pill = b.url
      ? el('a', 'lb-button', { href: b.url, target: '_blank', rel: 'noopener noreferrer' })
      : el('span', 'lb-button no-url');
    pill.appendChild(el('span', 'lb-button-label', { text: b.label || b.url || 'Link' }));
    pill.appendChild(icon('link', 'lb-button-ic'));
    wrap.appendChild(pill);
    return wrap;
  }

  const EXTRA_RENDERERS = {
    toggle: renderToggle, timeline: renderTimeline, counter: renderCounter, quiz: renderQuiz, coupon: renderCoupon,
    poem: renderPoem, place: renderPlace, columns: renderColumns, button: renderButton,
  };

  /** Normaliza um link de botão como o servidor faz (só http/https; "site.com" vira "https://site.com"). */
  function normalizeUrl(url) {
    url = (url || '').trim();
    if (!url || /[\s<>"]/.test(url)) return '';
    if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = 'https://' + url.replace(/^\/+/, '');
    try {
      const u = new URL(url);
      if (!/^https?:$/.test(u.protocol) || !u.hostname || (!u.hostname.includes('.') && u.hostname !== 'localhost')) return '';
      return url;
    } catch (e) {
      return '';
    }
  }

  function renderImageFigure(b) {
    const fig = el('figure', 'lb-figure frame-' + (b.frame || 'polaroid') + ' w-' + (b.width || 'md') + (b.filter && IMAGE_FILTERS[b.filter] ? ' imgf-' + b.filter : ''));
    fig.style.setProperty('--tilt', (b.tilt || 0) + 'deg');
    if (b.src) {
      fig.appendChild(el('img', '', { src: mediaUrl(b.src), alt: b.caption || '', loading: 'lazy' }));
    } else {
      fig.appendChild(el('div', 'img-placeholder', { text: '🖼️' }));
    }
    if (b.caption || b.frame === 'polaroid') {
      fig.appendChild(el('figcaption', '', { text: b.caption || '' }));
    }
    return fig;
  }

  const SCRATCH_COVERS = {
    silver: { label: 'Prata', stops: ['#b9bec6', '#eef0f3', '#a9aeb7', '#dfe2e7'], ink: '#4a4f57' },
    gold: { label: 'Dourada', stops: ['#c99a3b', '#f6dd8f', '#b8862b', '#ecca6c'], ink: '#5a3d0a' },
    pink: { label: 'Rosa', stops: ['#e59bb0', '#fbd7e1', '#d77f99', '#f4bdcc'], ink: '#6b2338' },
    mint: { label: 'Menta', stops: ['#8fcab3', '#d6f1e6', '#79b79f', '#bfe6d6'], ink: '#1f5240' },
  };

  /** Raspadinha: quem recebe raspa com o dedo (ou o mouse) para revelar. */
  function renderScratch(b, interactive) {
    const wrap = el('div', 'scratch');
    const inner = el('div', 'scratch-content');
    if (b.src) inner.appendChild(el('img', '', { src: mediaUrl(b.src), alt: '', loading: 'lazy' }));
    if (b.html) inner.appendChild(el('div', 'lb-text', { html: b.html }));
    wrap.appendChild(inner);
    if (!interactive) return wrap;

    const cv = el('canvas', 'scratch-cover', { 'aria-label': b.label || 'Raspe aqui' });
    wrap.appendChild(cv);
    const cover = SCRATCH_COVERS[b.cover] || SCRATCH_COVERS.silver;
    let ready = false;
    let strokes = 0;
    let done = false;
    const paint = () => {
      const r = wrap.getBoundingClientRect();
      if (!r.width || !r.height || ready) return;
      ready = true;
      const dpr = window.devicePixelRatio || 1;
      cv.width = Math.round(r.width * dpr);
      cv.height = Math.round(r.height * dpr);
      const ctx = cv.getContext('2d');
      ctx.scale(dpr, dpr);
      const g = ctx.createLinearGradient(0, 0, r.width, r.height);
      cover.stops.forEach((c, i) => g.addColorStop(i / (cover.stops.length - 1), c));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, r.width, r.height);
      // brilho e granulado
      for (let i = 0; i < r.width * r.height / 60; i++) {
        ctx.fillStyle = 'rgba(255,255,255,' + Math.random() * 0.35 + ')';
        ctx.fillRect(Math.random() * r.width, Math.random() * r.height, 1, 1);
      }
      ctx.fillStyle = cover.ink;
      ctx.font = '600 15px Geist, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((b.label || 'Raspe aqui').toUpperCase(), r.width / 2, r.height / 2);
      ctx.globalCompositeOperation = 'destination-out';
    };
    // mede numa cópia reduzida (64×64): ler a tela inteira travaria celulares
    let probe = null;
    const progress = () => {
      if (!cv.width || !cv.height) return 0;
      if (!probe) {
        probe = document.createElement('canvas');
        probe.width = probe.height = 64;
      }
      const pctx = probe.getContext('2d', { willReadFrequently: true });
      pctx.clearRect(0, 0, 64, 64);
      pctx.drawImage(cv, 0, 0, 64, 64);
      const data = pctx.getImageData(0, 0, 64, 64).data;
      let clear = 0;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 40) clear++;
      }
      return clear / (64 * 64);
    };
    const scratchAt = (e) => {
      const r = cv.getBoundingClientRect();
      const ctx = cv.getContext('2d');
      ctx.beginPath();
      ctx.arc(e.clientX - r.left, e.clientY - r.top, Math.max(16, r.width / 18), 0, Math.PI * 2);
      ctx.fill();
      if (++strokes % 12 === 0 && progress() > 0.55) finish();
    };
    const finish = () => {
      if (done) return;
      done = true;
      wrap.classList.add('scratched');
      reveal.remove();
      setTimeout(() => cv.remove(), 700);
    };
    // quem não consegue raspar (teclado, leitor de tela) revela com um botão
    const reveal = el('button', 'visually-hidden', { type: 'button', text: 'Revelar: ' + (b.label || 'Raspe aqui') });
    reveal.addEventListener('click', finish);
    wrap.appendChild(reveal);
    let down = false;
    cv.addEventListener('pointerdown', (e) => { down = true; cv.setPointerCapture(e.pointerId); scratchAt(e); });
    cv.addEventListener('pointermove', (e) => { if (down) scratchAt(e); });
    cv.addEventListener('pointerup', () => { down = false; });
    cv.addEventListener('pointercancel', () => { down = false; });
    if (window.ResizeObserver) new ResizeObserver(paint).observe(wrap);
    requestAnimationFrame(paint);
    wrap.querySelectorAll('img').forEach((img) => img.addEventListener('load', () => { ready = false; paint(); }));
    return wrap;
  }

  const SCATTER_TILT = [-6, 4, -3, 7, -5, 3, -2, 6];

  function renderGallery(b) {
    const wrap = el('div', 'gallery gallery-' + (b.layout || 'scatter') + (b.filter && IMAGE_FILTERS[b.filter] ? ' imgf-' + b.filter : ''));
    (b.items || []).forEach((item, i) => {
      const fig = el('figure', 'gallery-item');
      if (b.layout !== 'grid') fig.style.setProperty('--tilt', (b.layout === 'strip' ? 0 : SCATTER_TILT[i % SCATTER_TILT.length]) + 'deg');
      if (item.src) fig.appendChild(el('img', '', { src: mediaUrl(item.src), alt: item.caption || '', loading: 'lazy' }));
      if (b.layout === 'scatter' || item.caption) fig.appendChild(el('figcaption', '', { text: item.caption || '' }));
      wrap.appendChild(fig);
    });
    return wrap;
  }

  function fmtTime(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }

  /** Player de mensagem de voz com forma de onda. */
  function renderAudio(b) {
    const wrap = el('div', 'voice');
    const audio = el('audio', '', { src: mediaUrl(b.src), preload: 'metadata' });
    const btn = el('button', 'voice-play', { type: 'button', 'aria-label': 'Ouvir mensagem' });
    btn.appendChild(icon('play'));
    const wave = el('div', 'voice-wave');
    const peaks = b.peaks && b.peaks.length ? b.peaks : Array.from({ length: 48 }, (_, i) => 0.3 + 0.5 * Math.abs(Math.sin(i * 1.7)));
    peaks.forEach((p) => {
      const bar = el('span');
      bar.style.height = Math.max(22, Math.round(p * 100)) + '%';
      wave.appendChild(bar);
    });
    const meta = el('div', 'voice-meta');
    meta.appendChild(el('span', 'voice-label', { text: b.label || 'Mensagem de voz' }));
    const time = el('span', 'voice-time', { text: fmtTime(b.duration) });
    meta.appendChild(time);
    const body = el('div', 'voice-body');
    body.append(wave, meta);
    wrap.append(btn, body, audio);

    const bars = Array.from(wave.children);
    const paint = () => {
      const dur = audio.duration && isFinite(audio.duration) ? audio.duration : b.duration || 1;
      const ratio = audio.currentTime / dur;
      bars.forEach((bar, i) => bar.classList.toggle('on', i / bars.length < ratio));
      time.textContent = audio.paused && audio.currentTime === 0 ? fmtTime(b.duration) : fmtTime(audio.currentTime);
    };
    btn.addEventListener('click', () => {
      document.querySelectorAll('.voice audio').forEach((a) => { if (a !== audio) a.pause(); });
      if (audio.paused) audio.play();
      else audio.pause();
    });
    audio.addEventListener('play', () => { btn.replaceChildren(icon('pause')); wrap.classList.add('playing'); });
    audio.addEventListener('pause', () => { btn.replaceChildren(icon('play')); wrap.classList.remove('playing'); });
    audio.addEventListener('ended', () => { audio.currentTime = 0; paint(); });
    audio.addEventListener('timeupdate', paint);
    wave.addEventListener('click', (e) => {
      const r = wave.getBoundingClientRect();
      const dur = audio.duration && isFinite(audio.duration) ? audio.duration : b.duration;
      if (dur) {
        audio.currentTime = ((e.clientX - r.left) / r.width) * dur;
        if (audio.paused) audio.play();
      }
    });
    return wrap;
  }

  function renderDivider(b) {
    const div = el('div', 'divider divider-' + (b.style || 'hearts'), { role: 'separator' });
    if (DIVIDER_TEXT[b.style]) div.appendChild(el('span', '', { text: DIVIDER_TEXT[b.style] }));
    return div;
  }

  function renderSignature(b) {
    const wrap = el('div', 'signature');
    if (b.closing) wrap.appendChild(el('p', 'sig-closing', { text: b.closing }));
    if (b.name) wrap.appendChild(el('p', 'sig-name', { text: b.name }));
    if (b.date) wrap.appendChild(el('p', 'sig-date', { text: b.date }));
    return wrap;
  }

  // ---------- Adesivos ----------

  function stickerEl(s) {
    const node = el('div', 'sticker sticker-' + s.kind);
    node.dataset.id = s.id;
    updateStickerBox(node, s);
    fillSticker(node, s);
    return node;
  }

  function updateStickerBox(node, s) {
    node.style.setProperty('--x', s.x);
    node.style.setProperty('--w', s.w);
    node.style.setProperty('--r', (s.r || 0) + 'deg');
    node.style.setProperty('--flip', s.f ? -1 : 1);
    node.style.opacity = s.o !== undefined && s.o < 1 ? s.o : '';
    node.classList.toggle('locked', !!s.lk);
  }

  function fillSticker(node, s) {
    node.replaceChildren();
    switch (s.kind) {
      case 'emoji':
        node.appendChild(el('span', 'st-emoji', { text: s.char }));
        break;
      case 'image': {
        const img = el('img', s.fi && IMAGE_FILTERS[s.fi] ? 'imgf-' + s.fi : '', { src: mediaUrl(s.src), alt: '', draggable: 'false' });
        if (s.mask && MASKS[s.mask]) node.appendChild(photoFrame(img, s.mask));
        else node.appendChild(img);
        break;
      }
      case 'shape':
        node.appendChild(shapeSvg(s));
        break;
      case 'text': {
        const t = el('div', 'st-text st-' + (s.style || 'none'), { text: s.text || '' });
        t.style.fontFamily = (FONTS[s.font] || FONTS.caveat).css;
        t.style.setProperty('--st-scale', (FONTS[s.font] || FONTS.caveat).scale);
        t.style.color = s.color || '#3b3340';
        textExtras(t, s);
        node.appendChild(t);
        break;
      }
      case 'tape':
        node.appendChild(el('div', 'st-tape tape-' + (s.pattern || 'pink')));
        break;
      case 'doodle':
        node.appendChild(doodleSvg(s.name, s.c));
        break;
      case 'drawing': {
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('viewBox', '0 0 ' + s.vw + ' ' + s.vh);
        svg.setAttribute('class', 'st-drawing');
        (s.paths || []).forEach((p) => {
          if (p.b && BRUSHES[p.b]) {
            svg.appendChild(brushStroke(p));
            return;
          }
          const path = document.createElementNS(ns, 'path');
          path.setAttribute('d', p.d);
          path.setAttribute('stroke', p.c);
          path.setAttribute('stroke-width', p.s);
          path.setAttribute('fill', 'none');
          path.setAttribute('stroke-linecap', 'round');
          path.setAttribute('stroke-linejoin', 'round');
          svg.appendChild(path);
        });
        node.appendChild(svg);
        break;
      }
    }
    // animação e contorno ficam num invólucro: o transform do próprio adesivo guarda posição e giro
    const an = s.an && STICKER_ANIMS[s.an] ? s.an : '';
    const ol = s.ol && STICKER_OUTLINES[s.ol] ? s.ol : '';
    if (an || ol) {
      const wrap = el('div', 'st-fx' + (an ? ' an-' + an : '') + (ol ? ' ol-' + ol : ''));
      wrap.append(...node.childNodes);
      node.appendChild(wrap);
    }
  }

  function shapeSvg(s) {
    const ns = 'http://www.w3.org/2000/svg';
    const def = SHAPES[s.name] || SHAPES.heart;
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', def.vb);
    svg.setAttribute('class', 'st-shape');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', def.d);
    path.setAttribute('fill', s.c || '#f4a3b5');
    const sw = Math.max(0, Math.min(8, Number(s.sw) || 0));
    if (s.s && sw > 0) {
      path.setAttribute('stroke', s.s);
      path.setAttribute('stroke-width', String(sw * 2));
      path.setAttribute('stroke-linejoin', 'round');
      path.setAttribute('paint-order', 'stroke');
    }
    svg.appendChild(path);
    return svg;
  }

  // ---------- Tela livre: fotos com moldura, textos com mais opções e pincéis ----------

  /** Foto solta dentro de uma moldura/recorte (tudo em medidas relativas: muda só de escala). */
  function photoFrame(img, mask) {
    const def = MASKS[mask];
    const fr = el('div', 'st-photo mk-' + mask);
    if (def.path) {
      img.style.webkitMaskImage = maskUrl(def.path);
      img.style.maskImage = maskUrl(def.path);
    }
    fr.appendChild(img);
    return fr;
  }

  /** Fundo, negrito, itálico, alinhamento, tamanho e texto em curva (campos opcionais). */
  function textExtras(t, s) {
    if (s.bg && /^#[0-9a-f]{6}$/i.test(s.bg)) {
      t.classList.add('has-bg');
      t.style.setProperty('--st-bg', s.bg);
    }
    if (s.bd) t.style.fontWeight = '700';
    if (s.it) t.style.fontStyle = 'italic';
    if (s.al === 'left' || s.al === 'right') t.style.textAlign = s.al;
    const fs = Number(s.fs) || 1;
    if (fs !== 1) {
      t.classList.add('has-fs');
      t.style.setProperty('--st-fs', Math.max(0.4, Math.min(4, fs)));
    }
    const cv = Math.max(-100, Math.min(100, Number(s.cv) || 0));
    if (cv) {
      t.classList.add('st-curved');
      t.replaceChildren(curvedText(s, cv, Math.max(0.4, Math.min(4, fs))));
    }
  }

  /**
   * Texto em arco (SVG textPath). O desenho tem 1000 de largura e ocupa a largura do adesivo,
   * então a letra acompanha o tamanho do adesivo em qualquer tela.
   */
  function curvedText(s, cv, fs) {
    const ns = 'http://www.w3.org/2000/svg';
    const font = FONTS[s.font] || FONTS.caveat;
    const F = 85 * font.scale * fs;
    const h = (Math.abs(cv) / 100) * 500; // flecha do arco (100 = meio círculo)
    const R = (500 * 500 + h * h) / (2 * h);
    const up = cv > 0;
    const label = String(s.text || '').replace(/\s*\n\s*/g, ' ');
    // a caixa recorta só o trecho do arco ocupado pelo texto (estimado pelo nº de letras: igual em qualquer tela)
    const half = Math.min(Math.PI / 2, Math.max(0.05, Math.min(1000, Array.from(label).length * F * 0.52) / (2 * R)));
    const sagText = Math.min(h, R * (1 - Math.cos(half)));
    const top = up ? F * 1.05 : sagText + F * 1.05; // ponto mais alto (∩) ou mais baixo (∪) do arco
    const yb = up ? top + h : top - h; // altura das pontas do arco
    const H = up ? top + sagText + F * 0.45 : top + F * 0.45;
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 1000 ' + H.toFixed(1));
    svg.setAttribute('class', 'st-arc');
    svg.setAttribute('aria-hidden', 'true');
    Object.assign(svg.dataset, { f: F.toFixed(2), h: h.toFixed(2), r: R.toFixed(2), yb: yb.toFixed(2), up: up ? '1' : '' });
    const id = 'arc-' + (s.id || 'x') + '-' + Math.random().toString(36).slice(2, 7);
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('id', id);
    path.setAttribute('fill', 'none');
    path.setAttribute('d', 'M0 ' + yb.toFixed(1) + ' A' + R.toFixed(1) + ' ' + R.toFixed(1) + ' 0 0 ' + (up ? 1 : 0) + ' 1000 ' + yb.toFixed(1));
    const text = document.createElementNS(ns, 'text');
    text.setAttribute('font-size', F.toFixed(1));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', 'currentColor');
    const tp = document.createElementNS(ns, 'textPath');
    tp.setAttribute('href', '#' + id);
    tp.setAttribute('startOffset', '50%');
    tp.textContent = label;
    text.appendChild(tp);
    svg.append(path, text);
    return svg;
  }

  /**
   * Camadas de cada pincel (largura, opacidade, deslocamento e tracejado proporcionais à espessura s).
   * Usadas pelo SVG do adesivo e pela prévia do desenho no editor.
   */
  function brushLayers(b, c, s) {
    const L = (color, w, o, dx, dy, dash) => ({ c: color, w: w * s, o, dx: (dx || 0) * s, dy: (dy || 0) * s, dash: dash ? [dash[0] * s, dash[1] * s] : null });
    switch (b) {
      case 'marker': return [L(c, 1.6, 0.45)];
      case 'pencil': return [L(c, 0.7, 0.75), L(c, 0.4, 0.4, 0.3, -0.25), L(c, 0.4, 0.35, -0.28, 0.3)];
      case 'chalk': return [L(c, 1, 0.6, 0, 0, [1.1, 0.45]), L(c, 0.7, 0.55, 0.18, 0.15, [0.5, 0.8]), L('#ffffff', 0.25, 0.35, 0, 0, [0.2, 1.3])];
      case 'neon': return [L(c, 3.2, 0.18), L(c, 1.9, 0.4), L(c, 1, 0.95), L('#ffffff', 0.38, 0.9)];
      default: return [L(c, 1, 1)];
    }
  }

  /** Traço com pincel: camadas de SVG simples (sem filtros), igual na tela, na impressão e na imagem salva. */
  function brushStroke(p) {
    const ns = 'http://www.w3.org/2000/svg';
    const g = document.createElementNS(ns, 'g');
    g.setAttribute('class', 'brush-' + p.b);
    const n = (v) => String(Math.round(v * 100) / 100);
    brushLayers(p.b, p.c, Number(p.s) || 3).forEach((ly) => {
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', p.d);
      path.setAttribute('stroke', ly.c);
      path.setAttribute('stroke-width', n(ly.w));
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-linecap', p.b === 'marker' ? 'square' : 'round');
      path.setAttribute('stroke-linejoin', 'round');
      if (ly.o < 1) path.setAttribute('stroke-opacity', String(ly.o));
      if (ly.dx || ly.dy) path.setAttribute('transform', 'translate(' + n(ly.dx) + ' ' + n(ly.dy) + ')');
      if (ly.dash) path.setAttribute('stroke-dasharray', n(ly.dash[0]) + ' ' + n(ly.dash[1]));
      g.appendChild(path);
    });
    return g;
  }

  function doodleSvg(name, color) {
    const ns = 'http://www.w3.org/2000/svg';
    const def = DOODLES[name] || DOODLES.heart;
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('class', 'st-doodle');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', def.d);
    path.setAttribute('stroke', color || '#3b3340');
    path.setAttribute('fill', def.fill ? (color || '#3b3340') : 'none');
    path.setAttribute('stroke-width', '4.5');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);
    return svg;
  }

  /** Posiciona cada adesivo verticalmente a partir do bloco ao qual está preso. */
  function layoutStickers(paper, stickers) {
    const layer = paper.querySelector('.sticker-layer');
    if (!layer) return;
    // primeiro só lê, depois só escreve: evita recalcular o layout a cada adesivo
    // medidas de layout (offset*), que ignoram animações e transformações em andamento:
    // assim a posição não depende do momento em que a carta foi medida
    const width = paper.clientWidth || 1;
    const blocks = paper.querySelector('.paper-inner');
    // fim natural do conteúdo: o .paper-inner estica junto com o min-height do papel (flex),
    // então medir a caixa dele faria a altura oscilar entre "com" e "sem" espaço para os adesivos
    let contentBottom = 0;
    if (blocks) {
      const cs = getComputedStyle(blocks);
      const last = blocks.lastElementChild;
      const natural = last
        ? last.offsetTop + last.offsetHeight + (parseFloat(getComputedStyle(last).marginBottom) || 0) + (parseFloat(cs.paddingBottom) || 0)
        : blocks.offsetHeight;
      contentBottom = blocks.offsetTop + Math.min(blocks.offsetHeight, Math.max(natural, parseFloat(cs.minHeight) || 0));
    }
    const items = [];
    stickers.forEach((s) => {
      const node = layer.querySelector('.sticker[data-id="' + s.id + '"]');
      if (!node) return;
      items.push({ node, top: anchorTop(paper, s.anchor) + (s.y * width) / 100, h: node.offsetHeight || 0 });
    });
    let maxBottom = 0;
    items.forEach((it) => {
      const top = Math.round(it.top * 10) / 10 + 'px';
      if (it.node.style.top !== top) it.node.style.top = top;
      maxBottom = Math.max(maxBottom, it.top + it.h / 2);
    });
    const minH = maxBottom > contentBottom ? Math.ceil(maxBottom + 24) + 'px' : '';
    if (paper.style.minHeight !== minH) paper.style.minHeight = minH;
  }

  /** Distância (em px de layout) do topo do papel até o topo do bloco. */
  function anchorTop(paper, anchor) {
    if (!anchor) return 0;
    const block = paper.querySelector('.lb[data-id="' + anchor + '"]');
    if (!block) return 0;
    let y = 0;
    let node = block;
    while (node && node !== paper) {
      y += node.offsetTop;
      node = node.offsetParent;
    }
    if (node === paper) return y;
    // fora da cadeia esperada (raro): volta para a medida visual
    return block.getBoundingClientRect().top - paper.getBoundingClientRect().top;
  }

  /** Quantos px de tela vale 1 unidade de projeto neste papel. */
  function unitPx(paper) {
    if (paper.classList.contains('paper-fluid')) return 1;
    const dw = parseFloat(getComputedStyle(paper).getPropertyValue('--dw')) || (paper.classList.contains('layout-2') ? 600 : 760);
    return (paper.clientWidth || dw) / dw;
  }

  /** Divide os blocos em páginas nas quebras de página; adesivos vão com o bloco ao qual estão presos. */
  function splitPages(content) {
    const pages = [{ blocks: [], stickers: [] }];
    const where = {};
    (content.blocks || []).forEach((b) => {
      if (b.type === 'pagebreak') {
        pages.push({ blocks: [], stickers: [] });
        return;
      }
      pages[pages.length - 1].blocks.push(b);
      where[b.id] = pages.length - 1;
    });
    (content.stickers || []).forEach((s) => {
      pages[s.anchor && where[s.anchor] !== undefined ? where[s.anchor] : 0].stickers.push(s);
    });
    return pages.filter((pg, i) => i === 0 || pg.blocks.length || pg.stickers.length);
  }

  /**
   * Sem adesivos, a posição exata não importa: o texto se ajusta à tela (letra grande no celular).
   * Com adesivos, o papel inteiro muda só de escala, para cada adesivo continuar em cima da palavra certa.
   */
  function setFluid(paper, fluid) {
    paper.dataset.fluid = fluid ? '1' : '';
    paper.classList.toggle('paper-fluid', fluid);
  }

  function buildPaper(scene, page, p, fluid, opts) {
    const paper = el('div', 'paper');
    paper.dataset.fluid = fluid ? '1' : '';
    applyPaper(scene, paper, p);
    const inner = el('div', 'paper-inner');
    opts = opts || {};
    const interactions = opts.interactions || {};
    page.blocks.forEach((b) => inner.appendChild(renderBlock(b, p, {
      interaction: interactions[b.id] || null, onInteract: opts.onInteract || null, sender: !!opts.sender, otherName: opts.otherName || '',
    })));
    paper.appendChild(inner);
    const layer = el('div', 'sticker-layer');
    page.stickers.forEach((s) => layer.appendChild(stickerEl(s)));
    paper.appendChild(layer);
    return paper;
  }

  /**
   * Monta a carta completa para leitura.
   * opts.reveal: blocos aparecem um a um · opts.onPage(paper, index): chamado quando uma página aparece pela 1ª vez
   * opts.interactions: {blockId: {value, at}} · opts.onInteract(blockId, value) → Promise (quem recebe responde/usa)
   * opts.sender: quem escreveu está vendo (resultados só para ler) · opts.otherName: nome de quem recebeu
   */
  function renderLetter(container, content, opts) {
    opts = opts || {};
    const p = content.paper || {};
    const scene = el('div', 'letter-scene');
    const pages = splitPages(content);
    const fluid = !(content.stickers || []).length && !(p.format && FORMATS[p.format]);
    const papers = pages.map((pg) => buildPaper(scene, pg, p, fluid, opts));
    let current = 0;
    const seen = new Set();
    const cleanups = [];
    const observers = [];

    const relayoutOne = (i) => layoutStickers(papers[i], pages[i].stickers);
    const relayout = () => relayoutOne(current);
    /** Todas as páginas (para imprimir): as escondidas aparecem só durante a medida. */
    const relayoutAll = () => {
      papers.forEach((paper, i) => {
        const wasHidden = paper.hidden;
        paper.hidden = false;
        relayoutOne(i);
        paper.hidden = wasHidden;
      });
    };
    // Enquanto o texto está sendo "escrito" (aria-busy), os adesivos se ajustam no máximo a cada 250 ms
    const timers = [];
    const lastRun = [];
    const scheduleRelayout = (i) => {
      if (timers[i]) return;
      const busy = papers[i].getAttribute('aria-busy') === 'true';
      const wait = busy ? Math.max(0, 250 - (performance.now() - (lastRun[i] || 0))) : 0;
      timers[i] = setTimeout(() => requestAnimationFrame(() => {
        timers[i] = 0;
        lastRun[i] = performance.now();
        relayoutOne(i);
      }), wait);
    };

    if (papers.length === 1) {
      scene.appendChild(papers[0]);
    } else {
      // Várias páginas: uma de cada vez, com setas e animação de folha virando
      const book = el('div', 'book');
      papers.forEach((paper, i) => {
        paper.classList.add('page');
        paper.hidden = i !== 0;
        book.appendChild(paper);
      });
      const nav = el('div', 'page-nav');
      const prev = el('button', 'page-btn', { type: 'button', 'aria-label': 'Página anterior' });
      prev.appendChild(icon('arrow-left'));
      const next = el('button', 'page-btn page-next', { type: 'button', 'aria-label': 'Próxima página' });
      next.appendChild(icon('arrow-left'));
      const count = el('span', 'page-count');
      nav.append(prev, count, next);
      scene.append(book, nav);
      const go = (to, dir) => {
        if (to < 0 || to >= papers.length || to === current) return;
        const from = papers[current];
        const target = papers[to];
        from.classList.add(dir > 0 ? 'turn-out-left' : 'turn-out-right');
        setTimeout(() => {
          from.hidden = true;
          from.classList.remove('turn-out-left', 'turn-out-right');
          target.hidden = false;
          target.classList.add(dir > 0 ? 'turn-in-right' : 'turn-in-left');
          setTimeout(() => target.classList.remove('turn-in-right', 'turn-in-left'), 450);
          current = to;
          update();
          relayout();
          const top = scene.getBoundingClientRect().top + window.scrollY - 70;
          if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
        }, 260);
      };
      const update = () => {
        count.textContent = (current + 1) + ' / ' + papers.length;
        prev.disabled = current === 0;
        next.disabled = current === papers.length - 1;
        if (!seen.has(current)) {
          seen.add(current);
          if (opts.onPage) opts.onPage(papers[current], current);
        }
      };
      prev.addEventListener('click', () => go(current - 1, -1));
      next.addEventListener('click', () => go(current + 1, 1));
      // Deslizar o dedo para os lados também vira a página (um dedo só, gesto mais horizontal que vertical)
      let sx = null;
      let sy = null;
      book.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) { sx = null; return; }
        sx = e.touches[0].clientX;
        sy = e.touches[0].clientY;
      }, { passive: true });
      book.addEventListener('touchmove', (e) => { if (e.touches.length > 1) sx = null; }, { passive: true });
      book.addEventListener('touchend', (e) => {
        if (sx === null || e.touches.length) return;
        const dx = e.changedTouches[0].clientX - sx;
        const dy = e.changedTouches[0].clientY - sy;
        sx = null;
        if (Math.abs(dx) > 60 && Math.abs(dx) > 1.5 * Math.abs(dy) && !e.target.closest('.scratch, .gallery-strip')) go(current + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      });
      const onKey = (e) => {
        if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        if (!scene.isConnected || !scene.getClientRects().length) return;
        const t = e.target;
        if (t && (t.isContentEditable || (t.closest && t.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')))) return;
        if (e.key === 'ArrowRight') go(current + 1, 1);
        else go(current - 1, -1);
      };
      document.addEventListener('keydown', onKey);
      cleanups.push(() => document.removeEventListener('keydown', onKey));
      container.replaceChildren(scene);
      update();
    }
    if (papers.length === 1) {
      container.replaceChildren(scene);
      seen.add(0);
      if (opts.onPage) opts.onPage(papers[0], 0);
    }

    if (opts.reveal) {
      // Os blocos aparecem um a um, como se a carta estivesse sendo desdobrada
      papers.forEach((paper) => {
        paper.classList.add('reveal');
        const blocksEls = paper.querySelectorAll('.paper-inner > .lb');
        blocksEls.forEach((n, i) => n.style.setProperty('--i', Math.min(i, 14)));
        paper.querySelectorAll('.sticker').forEach((n, i) => n.style.setProperty('--i', Math.min(blocksEls.length, 14) + i * 0.5));
      });
    }

    papers.forEach((paper, i) => {
      if (window.ResizeObserver) {
        const ro = new ResizeObserver(() => scheduleRelayout(i));
        ro.observe(paper.querySelector('.paper-inner'));
        observers.push(ro);
      }
      paper.querySelectorAll('img').forEach((img) => img.addEventListener('load', () => scheduleRelayout(i)));
    });
    relayout();
    if (document.fonts) document.fonts.ready.then(() => { if (scene.isConnected) relayout(); });
    return {
      scene, papers, relayout, relayoutAll,
      get paper() { return papers[current]; },
      /** Solta ouvintes e observadores (o editor recria a prévia várias vezes). */
      destroy() {
        cleanups.splice(0).forEach((fn) => fn());
        observers.splice(0).forEach((ro) => ro.disconnect());
        timers.forEach((t) => clearTimeout(t));
      },
    };
  }

  // ---------- Envelope ----------

  const MESES_CURTOS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

  function stampEl(key) {
    const def = STAMPS[key];
    if (!def) return null;
    const wrap = el('span', 'stamp');
    wrap.innerHTML = '<svg viewBox="0 0 60 72" aria-hidden="true"><rect width="60" height="72" fill="' + def.bg + '"/>'
      + def.svg + '<text x="5" y="68" font-size="6" font-family="Georgia, serif" fill="rgba(0,0,0,.55)">CORREIO</text></svg>';
    return wrap;
  }

  /** Selo com a foto de quem escreveu. Se a foto não abrir (carta ainda lacrada), volta ao selo desenhado. */
  function photoStampEl(src, fallbackKey) {
    const wrap = el('span', 'stamp stamp-photo');
    const img = el('img', '', { src: mediaUrl(src), alt: '', loading: 'lazy', draggable: 'false' });
    img.addEventListener('error', () => {
      const alt = stampEl(fallbackKey);
      if (alt) wrap.replaceWith(alt);
      else if (wrap.parentNode) wrap.parentNode.remove();
    });
    wrap.appendChild(img);
    return wrap;
  }

  /** Carimbo postal com a data de envio. */
  function postmarkEl(date) {
    const d = date ? new Date(date) : new Date();
    const text = String(d.getDate()).padStart(2, '0') + ' ' + MESES_CURTOS[d.getMonth()] + ' ' + d.getFullYear();
    const id = 'pm' + Math.random().toString(36).slice(2, 7);
    const wrap = el('span', 'postmark');
    wrap.innerHTML = '<svg viewBox="0 0 150 70" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6">'
      + '<path d="M2 22c10-5 20 5 30 0s20-5 30 0M2 34c10-5 20 5 30 0s20-5 30 0M2 46c10-5 20 5 30 0s20-5 30 0"/>'
      + '<circle cx="110" cy="35" r="30"/><circle cx="110" cy="35" r="23"/></g>'
      + '<path id="' + id + '" d="M84 35a26 26 0 1 1 52 0" fill="none"/>'
      + '<text font-size="7.5" letter-spacing="1.5" fill="currentColor" font-family="Georgia, serif"><textPath href="#' + id + '" startOffset="50%" text-anchor="middle">CARTAS DA ALMA</textPath></text>'
      + '<text x="110" y="38" font-size="8.5" text-anchor="middle" fill="currentColor" font-family="Georgia, serif">' + text + '</text></svg>';
    return wrap;
  }

  function renderEnvelope(env, toName, opts) {
    opts = opts || {};
    const wrap = el('div', 'envelope' + (opts.locked ? ' locked' : ''));
    wrap.style.setProperty('--env', env.color || '#e9b8b0');
    wrap.style.setProperty('--seal', env.sealColor || '#a8323e');
    wrap.appendChild(el('div', 'env-back'));
    wrap.appendChild(el('div', 'env-liner liner-' + (env.liner || 'plain')));
    const letter = el('div', 'env-letter');
    if (opts.paperColor) letter.style.background = opts.paperColor;
    letter.appendChild(el('span', 'env-letter-lines'));
    wrap.appendChild(letter);
    const front = el('div', 'env-front');
    wrap.appendChild(front);
    const flap = el('div', 'env-flap');
    flap.appendChild(el('div', 'env-flap-inner liner-' + (env.liner || 'plain')));
    wrap.appendChild(flap);

    const seal = el(opts.interactive ? 'button' : 'span', 'env-seal', opts.interactive ? { type: 'button', 'aria-label': 'Abrir a carta' } : null);
    const face = el('span', 'env-seal-face');
    if (opts.locked) face.appendChild(icon('lock'));
    else face.textContent = env.seal || '❤';
    seal.appendChild(face);
    wrap.appendChild(seal);

    const address = el('div', 'env-address');
    if (env.label) address.appendChild(el('span', 'env-open-when', { text: env.label }));
    if (toName) address.appendChild(el('span', 'env-label', { text: 'Para ' + toName }));
    wrap.appendChild(address);

    const stamp = env.stampImage && /^[a-f0-9]{32}\.(jpg|png|webp|gif)$/.test(env.stampImage)
      ? photoStampEl(env.stampImage, env.stamp) : stampEl(env.stamp);
    if (stamp) {
      const corner = el('div', 'env-stamp');
      corner.appendChild(stamp);
      if (opts.sentAt !== null) corner.appendChild(postmarkEl(opts.sentAt));
      wrap.appendChild(corner);
    }
    return wrap;
  }

  // ---------- Efeitos ao abrir ----------

  /**
   * Efeito de abertura (corações, confete, pétalas, estrelas, neve).
   * Feito com animações CSS de transform/opacity: o celular executa direto na placa de vídeo,
   * separado da página, então o efeito nunca deixa a rolagem engasgar.
   */
  function playEffect(kind, duration, opts) {
    if (!kind || kind === 'none' || window.matchMedia('(prefers-reduced-motion: reduce)').matches
      || document.documentElement.dataset.reduceMotion === '1') return;
    opts = opts && typeof opts === 'object' ? opts : {};
    const custom = (opts.colors || []).filter((c) => /^#[0-9a-f]{6}$/i.test(c)).slice(0, 4);
    const palettes = {
      hearts: ['#e05a6d', '#f08ca0', '#c43b52', '#f7b6c2'],
      confetti: ['#e05a6d', '#f2b84b', '#4f9d8a', '#5b8fd9', '#9b7be0', '#f08c4a'],
      petals: ['#f5b8c6', '#f9d3dc', '#ee9fb1', '#fbe3e8'],
      stars: ['#f5d77a', '#fff3c4', '#f2b84b'],
      snow: ['#ffffff', '#eef4fb'],
    };
    const colors = custom.length ? custom : (palettes[kind] || palettes.confetti);
    const emojis = kind === 'emoji' ? ((opts.emojis || []).filter((x) => typeof x === 'string' && x.trim()).slice(0, 3)) : [];
    if (kind === 'emoji' && !emojis.length) emojis.push(...EFFECT_EMOJIS);
    const total = duration || 5200;
    const rnd = (x, y) => x + Math.random() * (y - x);
    // menos partículas em telas pequenas: o efeito continua cheio, com metade do trabalho
    const area = Math.min(1, Math.max(0.5, (innerWidth * innerHeight) / (1280 * 800)));
    const count = Math.round((kind === 'stars' ? 40 : kind === 'emoji' ? 38 : 56) * area);
    const shape = (color) => {
      if (kind === 'hearts') {
        return 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 18"><path d="M10 17S1 11.5 1 5.6A4.6 4.6 0 0 1 10 3.4 4.6 4.6 0 0 1 19 5.6C19 11.5 10 17 10 17z" fill="' + color + '"/></svg>') + '") center / contain no-repeat';
      }
      if (kind === 'stars') {
        return 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -10 20 20"><path d="M0-10L2.2-2.2 10 0 2.2 2.2 0 10-2.2 2.2-10 0-2.2-2.2z" fill="' + color + '"/></svg>') + '") center / contain no-repeat';
      }
      return color;
    };
    const layer = el('div', 'fx-layer fx-' + kind, { 'aria-hidden': 'true' });
    for (let i = 0; i < count; i++) {
      const size = kind === 'snow' ? rnd(4, 9) : kind === 'stars' ? rnd(10, 20) : kind === 'emoji' ? rnd(18, 34) : rnd(9, 17);
      const fall = kind === 'snow' ? rnd(5500, 9000) : rnd(3200, 5400);
      const node = el('i', 'fx');
      node.style.cssText = '--x:' + rnd(0, 100).toFixed(1) + 'vw;--y:' + rnd(0, 100).toFixed(1) + 'vh;--dx:' + rnd(-12, 12).toFixed(1) + 'vw;'
        + '--r0:' + rnd(0, 360).toFixed(0) + 'deg;--r1:' + rnd(-540, 540).toFixed(0) + 'deg;--s:' + size.toFixed(1) + 'px;'
        + '--d:' + fall.toFixed(0) + 'ms;--delay:' + (kind === 'stars' ? rnd(0, 1600) : rnd(-fall * 0.6, Math.max(0, total - fall - 400))).toFixed(0) + 'ms;'
        + (kind === 'emoji' ? '' : 'background:' + shape(colors[i % colors.length]));
      if (kind === 'emoji') node.textContent = emojis[i % emojis.length];
      layer.appendChild(node);
    }
    document.body.appendChild(layer);
    setTimeout(() => layer.classList.add('fx-out'), Math.max(0, total - 1100));
    setTimeout(() => layer.remove(), total + 200);
  }

  // ---------- Imagem salva (html2canvas): recortes e textos em curva viram canvas ----------
  // O html2canvas não entende máscara CSS, object-fit nem fontes dentro de SVG; no clone usado
  // para a imagem, cada foto recortada e cada texto em curva é pintado num canvas com o mesmo desenho.

  function coverDraw(ctx, img, x, y, w, h) {
    const iw = img.naturalWidth || w;
    const ih = img.naturalHeight || h;
    const sc = Math.max(w / iw, h / ih);
    const sw = w / sc;
    const sh = h / sc;
    ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h);
  }

  function clipMask(ctx, mask, w, h) {
    const def = MASKS[mask] || {};
    if (def.path) {
      const p = new Path2D();
      p.addPath(new Path2D(def.path), new DOMMatrix().scale(w / 100, h / 100));
      ctx.clip(p);
      return;
    }
    ctx.beginPath();
    if (mask === 'circle') ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    else if (mask === 'rounded') ctx.roundRect(0, 0, w, h, w * 0.12);
    else if (mask === 'arch') ctx.roundRect(0, 0, w, h, [w / 2, w / 2, 0, 0]);
    else ctx.rect(0, 0, w, h);
    ctx.clip();
  }

  function bakePhoto(fr, srcImg, scale) {
    const mask = (fr.className.match(/\bmk-(\S+)/) || [])[1];
    const img = fr.querySelector('img');
    if (!img || !srcImg || !srcImg.complete || !srcImg.naturalWidth) return;
    const stamp = mask === 'stamp';
    const box = stamp ? fr : img;
    const w = box.offsetWidth;
    const h = box.offsetHeight;
    if (!w || !h) return;
    const cv = document.createElement('canvas');
    cv.width = Math.round(w * scale);
    cv.height = Math.round(h * scale);
    const ctx = cv.getContext('2d');
    ctx.scale(scale, scale);
    const filter = getComputedStyle(img).filter;
    if (filter && filter !== 'none') ctx.filter = filter;
    cv.style.cssText = 'display:block;width:100%;height:' + h + 'px';
    if (stamp) {
      // papel branco de selo, com a borda ondulada igual à do CSS (.mk-stamp: --sc = 6% da largura)
      const pad = parseFloat(getComputedStyle(fr).paddingLeft) || 0;
      const sc = w * 0.06;
      ctx.save();
      ctx.filter = 'none';
      ctx.fillStyle = '#fffefa';
      ctx.beginPath();
      ctx.rect(sc / 2, sc / 2, w - sc, h - sc);
      const dots = (len, at) => {
        const n = Math.max(1, Math.round(len / sc));
        const tile = len / n;
        const r = Math.min(tile, sc) / 2;
        for (let i = 0; i < n; i++) at(tile * (i + 0.5), r);
      };
      const dot = (x, y, r) => { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2); };
      dots(w, (x, r) => { dot(x, sc / 2, r); dot(x, h - sc / 2, r); });
      dots(h, (y, r) => { dot(sc / 2, y, r); dot(w - sc / 2, y, r); });
      ctx.fill();
      ctx.restore();
      ctx.drawImage(srcImg, pad, pad, w - pad * 2, h - pad * 2);
      fr.style.padding = '0';
      fr.style.background = 'none';
      fr.style.webkitMask = 'none';
      fr.style.mask = 'none';
      fr.replaceChildren(cv);
      return;
    }
    clipMask(ctx, mask, w, h);
    coverDraw(ctx, srcImg, 0, 0, w, h);
    img.replaceWith(cv);
  }

  function bakeArc(svg, scale) {
    const w = svg.clientWidth || svg.getBoundingClientRect().width;
    const vb = (svg.getAttribute('viewBox') || '').split(/\s+/).map(Number);
    if (!w || vb.length !== 4) return;
    const k = w / 1000;
    const h = vb[3] * k;
    const cv = document.createElement('canvas');
    cv.width = Math.round(w * scale);
    cv.height = Math.round(h * scale);
    const ctx = cv.getContext('2d');
    ctx.scale(scale * k, scale * k);
    const host = svg.parentNode;
    const cs = getComputedStyle(host);
    const F = Number(svg.dataset.f);
    const sag = Number(svg.dataset.h);
    const R = Number(svg.dataset.r);
    const yb = Number(svg.dataset.yb);
    const up = svg.dataset.up === '1';
    ctx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + F + 'px ' + cs.fontFamily;
    ctx.textBaseline = 'alphabetic';
    const fill = cs.webkitTextFillColor;
    const outline = host.classList.contains('st-outline');
    ctx.fillStyle = fill && !/^rgba\(0, 0, 0, 0\)$/.test(fill) ? fill : cs.color;
    ctx.strokeStyle = cs.color;
    ctx.lineWidth = F * 0.045;
    const text = (svg.querySelector('textPath') || {}).textContent || '';
    const chars = Array.from(text);
    const widths = chars.map((c) => ctx.measureText(c).width);
    const total = widths.reduce((a, b) => a + b, 0);
    const cy = up ? yb - sag + R : yb + sag - R;
    let d = -total / 2;
    chars.forEach((c, i) => {
      const mid = d + widths[i] / 2;
      const th = up ? -Math.PI / 2 + mid / R : Math.PI / 2 - mid / R;
      ctx.save();
      ctx.translate(500 + R * Math.cos(th), cy + R * Math.sin(th));
      ctx.rotate(up ? th + Math.PI / 2 : th - Math.PI / 2);
      if (outline) ctx.strokeText(c, -widths[i] / 2, 0);
      else ctx.fillText(c, -widths[i] / 2, 0);
      ctx.restore();
      d += widths[i];
    });
    cv.style.cssText = 'display:block;width:100%;height:' + h + 'px';
    svg.replaceWith(cv);
  }

  /** Para o onclone do html2canvas: troca recortes e curvas por canvas no documento clonado. */
  function prepareExport(doc, scale) {
    scale = scale || 2;
    // no clone as animações de entrada recomeçariam do zero (blocos e adesivos invisíveis)
    doc.querySelectorAll('.paper.reveal').forEach((p) => p.classList.remove('reveal'));
    const originals = Array.from(document.querySelectorAll('.st-photo img'));
    Array.from(doc.querySelectorAll('.st-photo')).forEach((fr, i) => {
      try { bakePhoto(fr, originals[i], scale); } catch (e) { /* fica como o html2canvas conseguir */ }
    });
    Array.from(doc.querySelectorAll('.st-curved svg.st-arc')).forEach((svg) => {
      try { bakeArc(svg, scale); } catch (e) { /* idem */ }
    });
  }


  window.Letter = {
    FONTS, PAPERS, BORDERS, SCENES, LINERS, DIVIDERS, FRAMES, TAPES, TEXT_STYLES,
    DOODLES, STAMPS, EFFECTS, GALLERY_LAYOUTS, EFFECT_EMOJIS,
    SPACINGS, LEADINGS, BOX_BORDERS, BOX_RADII, BOX_PADS, BOX_WIDTHS, BOX_POSITIONS, applyBlockExtras, photoStampEl,
    SHAPES, SHAPE_COLORS, STICKER_ANIMS, STICKER_OUTLINES, IMAGE_FILTERS, TEXT_FX, shapeSvg,
    PAPER_COLORS, INK_COLORS, ACCENT_COLORS, SIZE_MUL,
    uid, el, icon, mediaUrl, unitPx, setFluid, parseMusicUrl, musicEmbed, isDark, fmtTime,
    renderGallery, renderAudio, renderScratch, SCRATCH_COVERS, doodleSvg, stampEl, postmarkEl, playEffect, splitPages,
    applyPaper, applyBlockStyle, renderBlock, renderImageFigure, renderDivider, renderSignature,
    EXTRA_RENDERERS, normalizeUrl, parseCounterDate, counterParts,
    stickerEl, updateStickerBox, fillSticker, layoutStickers, anchorTop,
    renderLetter, renderEnvelope,
    FORMATS, MASKS, BRUSHES, brushLayers, brushStroke, prepareExport,
  };
})();
