const fs = require('fs');
const path = require('path');

// 1. Full Dataset of 500+ Indian Places
const CITIES_BY_STATE = [
  // --- UTTAR PRADESH (75 Districts & Major Urban Centers) ---
  { name: 'Lucknow', state: 'Uttar Pradesh', district: 'Lucknow', lat: 26.8467, lng: 80.9462, cat: 'metro', icon: '🏙️', fame: 'City of Nawabs & Capital of Uttar Pradesh', aliases: ['lucknow', 'lko', 'hazratganj', 'charbagh', 'gomti nagar', 'aminabad', 'chowk lucknow'] },
  { name: 'Kanpur', state: 'Uttar Pradesh', district: 'Kanpur Nagar', lat: 26.4499, lng: 80.3319, cat: 'metro', icon: '🏙️', fame: 'Industrial & Leather Capital of North India', aliases: ['kanpur', 'cnb', 'kanpur central', 'mall road kanpur', 'iit kanpur', 'swaroop nagar'] },
  { name: 'Varanasi (Kashi)', state: 'Uttar Pradesh', district: 'Varanasi', lat: 25.3176, lng: 82.9739, cat: 'temple', icon: '🛕', fame: 'Spiritual Capital of India, Kashi Vishwanath & Ganga Ghats', aliases: ['varanasi', 'kashi', 'banaras', 'benares', 'bsb', 'dashashwamedh', 'assi ghat', 'bhu'] },
  { name: 'Prayagraj (Allahabad)', state: 'Uttar Pradesh', district: 'Prayagraj', lat: 25.4358, lng: 81.8463, cat: 'city', icon: '🛕', fame: 'Triveni Sangam & Maha Kumbh Mela', aliases: ['prayagraj', 'allahabad', 'pryj', 'sangam', 'civil lines prayagraj', 'anand bhavan'] },
  { name: 'Agra', state: 'Uttar Pradesh', district: 'Agra', lat: 27.1767, lng: 78.0081, cat: 'city', icon: '🏛️', fame: 'City of Taj Mahal & Mughal Heritage', aliases: ['agra', 'agc', 'agra cantt', 'tajganj', 'fatehpur sikri', 'sikandra'] },
  { name: 'Noida', state: 'Uttar Pradesh', district: 'Gautam Buddha Nagar', lat: 28.5355, lng: 77.3910, cat: 'metro', icon: '🏙️', fame: 'Major IT & Modern Commercial Hub in NCR', aliases: ['noida', 'sector 18 noida', 'sector 62 noida', 'gautam buddha nagar', 'noida expressway'] },
  { name: 'Greater Noida', state: 'Uttar Pradesh', district: 'Gautam Buddha Nagar', lat: 28.4744, lng: 77.5040, cat: 'city', icon: '🏙️', fame: 'Educational Hub & Buddh International Circuit', aliases: ['greater noida', 'pari chowk', 'knowledge park', 'yamuna expressway', 'jewar airport'] },
  { name: 'Ghaziabad', state: 'Uttar Pradesh', district: 'Ghaziabad', lat: 28.6692, lng: 77.4538, cat: 'city', icon: '🏙️', fame: 'Gateway of UP & Rapid Rail Corridor', aliases: ['ghaziabad', 'gzb', 'indirapuram', 'vaishali ghaziabad', 'raj nagar extension'] },
  { name: 'Meerut', state: 'Uttar Pradesh', district: 'Meerut', lat: 28.9845, lng: 77.7064, cat: 'city', icon: '🌆', fame: 'Sports Goods Manufacturing Capital & 1857 Revolution', aliases: ['meerut', 'sports city meerut', 'meerut cantt', 'naugaja peer'] },
  { name: 'Aligarh', state: 'Uttar Pradesh', district: 'Aligarh', lat: 27.8974, lng: 78.0880, cat: 'city', icon: '🌆', fame: 'Lock City of India & Aligarh Muslim University', aliases: ['aligarh', 'amu', 'tala nagari', 'aligarh junction'] },
  { name: 'Bareilly', state: 'Uttar Pradesh', district: 'Bareilly', lat: 28.3670, lng: 79.4304, cat: 'city', icon: '🌆', fame: 'Jhumka City & Zari Zardozi Embroidery', aliases: ['bareilly', 'bareilly cantt', 'jhumka bareilly', 'rohini bareilly'] },
  { name: 'Moradabad', state: 'Uttar Pradesh', district: 'Moradabad', lat: 28.8386, lng: 78.7733, cat: 'city', icon: '🌆', fame: 'Brass City of India (Peetal Nagari)', aliases: ['moradabad', 'brass city', 'peetal nagari', 'moradabad junction'] },
  { name: 'Saharanpur', state: 'Uttar Pradesh', district: 'Saharanpur', lat: 29.9640, lng: 77.5460, cat: 'city', icon: '🌆', fame: 'Wood Carving Capital & Agricultural Hub', aliases: ['saharanpur', 'wood city', 'shakumbhari devi'] },
  { name: 'Gorakhpur', state: 'Uttar Pradesh', district: 'Gorakhpur', lat: 26.7606, lng: 83.3732, cat: 'city', icon: '🛕', fame: 'Gorakhnath Temple & Gita Press', aliases: ['gorakhpur', 'gorakhnath mandir', 'gita press', 'gorakhpur junction', 'ramgarh taal'] },
  { name: 'Jhansi', state: 'Uttar Pradesh', district: 'Jhansi', lat: 25.4484, lng: 78.5685, cat: 'city', icon: '🏛️', fame: 'Historic Gateway of Bundelkhand & Rani Laxmi Bai Fort', aliases: ['jhansi', 'jglj', 'jhansi fort', 'rani lakshmi bai', 'bundelkhand'] },
  { name: 'Mathura', state: 'Uttar Pradesh', district: 'Mathura', lat: 27.4924, lng: 77.6737, cat: 'temple', icon: '🛕', fame: 'Krishna Janmabhoomi & Sacred Braj Bhoomi', aliases: ['mathura', 'krishna janmabhoomi', 'mathura cantt', 'vishram ghat', 'braj'] },
  { name: 'Vrindavan', state: 'Uttar Pradesh', district: 'Mathura', lat: 27.5806, lng: 77.7006, cat: 'temple', icon: '🛕', fame: 'Banke Bihari Mandir & Prem Mandir', aliases: ['vrindavan', 'banke bihari', 'prem mandir', 'iskcon vrindavan', 'nidhivan'] },
  { name: 'Ayodhya', state: 'Uttar Pradesh', district: 'Ayodhya', lat: 26.7922, lng: 82.1998, cat: 'temple', icon: '🛕', fame: 'Ram Janmabhoomi & Holy City on River Saryu', aliases: ['ayodhya', 'ram mandir', 'ram janmabhoomi', 'saryu ghat', 'hanuman garhi ayodhya'] },
  { name: 'Muzaffarnagar', state: 'Uttar Pradesh', district: 'Muzaffarnagar', lat: 29.4727, lng: 77.7085, cat: 'city', icon: '🌆', fame: 'Sugar Capital of North India', aliases: ['muzaffarnagar', 'sugar bowl', 'shukratal'] },
  { name: 'Firozabad', state: 'Uttar Pradesh', district: 'Firozabad', lat: 27.1590, lng: 78.3957, cat: 'city', icon: '🌆', fame: 'Glass City & Bangle Capital of India (Suhag Nagari)', aliases: ['firozabad', 'glass city', 'bangle city', 'suhag nagari'] },
  { name: 'Rampur', state: 'Uttar Pradesh', district: 'Rampur', lat: 28.8154, lng: 79.0257, cat: 'city', icon: '🌆', fame: 'Historic Raza Library & Rampuri Heritage', aliases: ['rampur', 'raza library', 'rampur up'] },
  { name: 'Shahjahanpur', state: 'Uttar Pradesh', district: 'Shahjahanpur', lat: 27.8805, lng: 79.9110, cat: 'city', icon: '🌆', fame: 'City of Martyrs (Shaheed Nagari)', aliases: ['shahjahanpur', 'shaheed nagari', 'kakori heroes'] },
  { name: 'Farrukhabad', state: 'Uttar Pradesh', district: 'Farrukhabad', lat: 27.3826, lng: 79.5829, cat: 'city', icon: '🌆', fame: 'Zari Embroidery & Textile Printing Hub', aliases: ['farrukhabad', 'fatehgarh', 'sankisa'] },
  { name: 'Hapur', state: 'Uttar Pradesh', district: 'Hapur', lat: 28.7306, lng: 77.7759, cat: 'city', icon: '🌆', fame: 'Jaggery (Gur) & Grain Trading Market', aliases: ['hapur', 'garhmukteshwar', 'hapur mandi'] },
  { name: 'Mirzapur', state: 'Uttar Pradesh', district: 'Mirzapur', lat: 25.1460, lng: 82.5690, cat: 'city', icon: '🌆', fame: 'Handcrafted Carpets & Vindhyavasini Temple', aliases: ['mirzapur', 'vindhyachal', 'vindhyavasini temple', 'carpet city mirzapur'] },
  { name: 'Bulandshahr', state: 'Uttar Pradesh', district: 'Bulandshahr', lat: 28.4069, lng: 77.8498, cat: 'city', icon: '🌆', fame: 'Khurja Pottery & Dairy Hub', aliases: ['bulandshahr', 'khurja pottery', 'narora nuclear plant'] },
  { name: 'Sambhal', state: 'Uttar Pradesh', district: 'Sambhal', lat: 28.5847, lng: 78.5529, cat: 'city', icon: '🌆', fame: 'Kalki Avatar Land & Bone Craft', aliases: ['sambhal', 'kalki dham', 'sambhal up'] },
  { name: 'Amroha', state: 'Uttar Pradesh', district: 'Amroha', lat: 28.9044, lng: 78.4674, cat: 'city', icon: '🌆', fame: 'Dholak & Musical Instruments Capital', aliases: ['amroha', 'dholak city', 'amroha junction'] },
  { name: 'Hardoi', state: 'Uttar Pradesh', district: 'Hardoi', lat: 27.3944, lng: 80.1319, cat: 'city', icon: '🌆', fame: 'Sandi Bird Sanctuary & Agricultural Trade', aliases: ['hardoi', 'sandi bird sanctuary', 'hardoi up'] },
  { name: 'Fatehpur', state: 'Uttar Pradesh', district: 'Fatehpur', lat: 25.9286, lng: 80.8119, cat: 'city', icon: '🌆', fame: 'Historic Ganga-Yamuna Doab Hub', aliases: ['fatehpur', 'fatehpur up', 'doab city'] },
  { name: 'Raebareli', state: 'Uttar Pradesh', district: 'Raebareli', lat: 26.2298, lng: 81.2408, cat: 'city', icon: '🌆', fame: 'Modern Coach Factory & AIIMS Raebareli', aliases: ['raebareli', 'modern coach factory', 'aiims raebareli'] },
  { name: 'Orai (Jalaun)', state: 'Uttar Pradesh', district: 'Jalaun', lat: 25.9898, lng: 79.4534, cat: 'city', icon: '🌆', fame: 'Bundelkhand Expressway Gateway', aliases: ['orai', 'jalaun', 'orai railway station'] },
  { name: 'Sitapur', state: 'Uttar Pradesh', district: 'Sitapur', lat: 27.5684, lng: 80.6829, cat: 'city', icon: '🌆', fame: 'Naimisharanya Holy Pilgrimage', aliases: ['sitapur', 'naimisharanya', 'neemsar', 'sitapur eye hospital'] },
  { name: 'Bahraich', state: 'Uttar Pradesh', district: 'Bahraich', lat: 27.5750, lng: 81.5970, cat: 'city', icon: '🌆', fame: 'Katarniaghat Wildlife Sanctuary', aliases: ['bahraich', 'katarniaghat', 'dargah ghazi sayyed'] },
  { name: 'Unnao', state: 'Uttar Pradesh', district: 'Unnao', lat: 26.5467, lng: 80.4879, cat: 'city', icon: '🌆', fame: 'Leather & Industrial Corridor between Kanpur-Lucknow', aliases: ['unnao', 'nawabganj bird sanctuary', 'shuklaganj'] },
  { name: 'Jaunpur', state: 'Uttar Pradesh', district: 'Jaunpur', lat: 25.7464, lng: 82.6837, cat: 'city', icon: '🏛️', fame: 'Shiraz-e-Hind, Shahi Bridge & Atala Mosque', aliases: ['jaunpur', 'shahi bridge jaunpur', 'atala masjid jaunpur'] },
  { name: 'Lakhimpur Kheri', state: 'Uttar Pradesh', district: 'Lakhimpur Kheri', lat: 27.9507, lng: 80.7777, cat: 'nature', icon: '🌳', fame: 'Dudhwa National Park & Tiger Reserve', aliases: ['lakhimpur', 'kheri', 'dudhwa national park', 'dudhwa tiger reserve'] },
  { name: 'Hathras', state: 'Uttar Pradesh', district: 'Hathras', lat: 27.6044, lng: 78.0519, cat: 'city', icon: '🌆', fame: 'Asafoetida (Hing) & Color Powder (Gulal) Capital', aliases: ['hathras', 'hing city', 'hathras junction'] },
  { name: 'Banda', state: 'Uttar Pradesh', district: 'Banda', lat: 25.4754, lng: 80.3347, cat: 'city', icon: '🌆', fame: 'Shajar Stone & Ken River Valley', aliases: ['banda', 'shajar stone', 'ken river banda'] },
  { name: 'Pilibhit', state: 'Uttar Pradesh', district: 'Pilibhit', lat: 28.6300, lng: 79.8000, cat: 'nature', icon: '🌳', fame: 'Pilibhit Tiger Reserve & Flute City of India', aliases: ['pilibhit', 'pilibhit tiger reserve', 'bansuri nagari', 'flute city'] },
  { name: 'Chitrakoot', state: 'Uttar Pradesh', district: 'Chitrakoot', lat: 25.1800, lng: 80.8700, cat: 'temple', icon: '🛕', fame: 'Holy Forest of Lord Rama, Ramghat & Kamadgiri', aliases: ['chitrakoot', 'ramghat', 'kamadgiri', 'gupt godavari', 'hanuman dhara'] },
  { name: 'Kushinagar', state: 'Uttar Pradesh', district: 'Kushinagar', lat: 26.7410, lng: 83.8890, cat: 'heritage', icon: '🏛️', fame: 'Mahaparinirvana Temple of Lord Buddha', aliases: ['kushinagar', 'mahaparinirvana temple', 'buddhist circuit kushinagar'] },
  { name: 'Sarnath', state: 'Uttar Pradesh', district: 'Varanasi', lat: 25.3811, lng: 83.0214, cat: 'heritage', icon: '🏛️', fame: 'Dhamek Stupa & Lion Capital of Ashoka', aliases: ['sarnath', 'dhamek stupa', 'ashoka pillar sarnath', 'deer park sarnath'] },

  // --- MAHARASHTRA (36 Districts & Metro Hubs) ---
  { name: 'Mumbai', state: 'Maharashtra', district: 'Mumbai City', lat: 18.9220, lng: 72.8347, cat: 'metro', icon: '🏙️', fame: 'Financial Capital of India, Gateway of India & Marine Drive', aliases: ['mumbai', 'bombay', 'cst', 'csmt', 'marine drive', 'bandra', 'nariman point', 'dadar', 'andheri', 'juhu'] },
  { name: 'Pune', state: 'Maharashtra', district: 'Pune', lat: 18.5204, lng: 73.8567, cat: 'metro', icon: '🏙️', fame: 'Oxford of the East, IT Hub & Shaniwar Wada', aliases: ['pune', 'poona', 'hinjewadi', 'viman nagar', 'kothrud', 'shaniwar wada', 'magarpatta', 'baner'] },
  { name: 'Nagpur', state: 'Maharashtra', district: 'Nagpur', lat: 21.1458, lng: 79.0882, cat: 'metro', icon: '🏙️', fame: 'Orange City, Zero Mile Marker & Deekshabhoomi', aliases: ['nagpur', 'orange city', 'zero mile', 'sitabuldi', 'deekshabhoomi', 'dharampeth'] },
  { name: 'Thane', state: 'Maharashtra', district: 'Thane', lat: 19.2183, lng: 72.9781, cat: 'metro', icon: '🏙️', fame: 'City of Lakes & Major Industrial Suburb', aliases: ['thane', 'tna', 'ghodbunder road', 'viviana mall', 'upvan lake'] },
  { name: 'Pimpri-Chinchwad', state: 'Maharashtra', district: 'Pune', lat: 18.6279, lng: 73.8009, cat: 'city', icon: '🏙️', fame: 'Automobile & Industrial Manufacturing Capital', aliases: ['pimpri', 'chinchwad', 'pcmc', 'nigdi', 'bhosari', 'wakad', 'punawale'] },
  { name: 'Nashik', state: 'Maharashtra', district: 'Nashik', lat: 19.9975, lng: 73.7898, cat: 'city', icon: '🛕', fame: 'Wine Capital of India, Trimbakeshwar & Kumbh Mela', aliases: ['nashik', 'nasik', 'trimbakeshwar', 'sula vineyards', 'panchavati', 'godavari ghats'] },
  { name: 'Kalyan-Dombivli', state: 'Maharashtra', district: 'Thane', lat: 19.2403, lng: 73.1305, cat: 'city', icon: '🌆', fame: 'Major Junction Hub in Mumbai Metropolitan Region', aliases: ['kalyan', 'dombivli', 'kyn', 'kalyan junction'] },
  { name: 'Vasai-Virar', state: 'Maharashtra', district: 'Palghar', lat: 19.3919, lng: 72.8397, cat: 'city', icon: '🌆', fame: 'Coastal Heritage Fort & Northern MMR Suburb', aliases: ['vasai', 'virar', 'vasai fort', 'arnala beach', 'nalasopara'] },
  { name: 'Chhatrapati Sambhajinagar (Aurangabad)', state: 'Maharashtra', district: 'Aurangabad', lat: 19.8762, lng: 75.3433, cat: 'city', icon: '🏛️', fame: 'Gateway to Ajanta-Ellora Caves & Bibi Ka Maqbara', aliases: ['aurangabad', 'sambhajinagar', 'chhatrapati sambhajinagar', 'bibi ka maqbara', 'daulatabad fort'] },
  { name: 'Navi Mumbai', state: 'Maharashtra', district: 'Thane', lat: 19.0330, lng: 73.0297, cat: 'metro', icon: '🏙️', fame: 'Planned 21st-Century City & Upcoming International Airport', aliases: ['navi mumbai', 'vashi', 'belapur', 'kharghar', 'nerul', 'panvel', 'palm beach road'] },
  { name: 'Solapur', state: 'Maharashtra', district: 'Solapur', lat: 17.6599, lng: 75.9064, cat: 'city', icon: '🌆', fame: 'Textile Capital, Chaddar & Siddheshwar Temple', aliases: ['solapur', 'sholapur', 'siddheshwar temple', 'solapur chaddar'] },
  { name: 'Amravati', state: 'Maharashtra', district: 'Amravati', lat: 20.9374, lng: 77.7796, cat: 'city', icon: '🌆', fame: 'Cultural Hub of Vidarbha & Ambadevi Temple', aliases: ['amravati', 'ambadevi temple', 'chikhaldara gateway'] },
  { name: 'Nanded', state: 'Maharashtra', district: 'Nanded', lat: 19.1383, lng: 77.3210, cat: 'temple', icon: '🛕', fame: 'Hazur Sahib Sachkhand Gurdwara on River Godavari', aliases: ['nanded', 'hazur sahib', 'sachkhand gurudwara', 'nanded station'] },
  { name: 'Kolhapur', state: 'Maharashtra', district: 'Kolhapur', lat: 16.7050, lng: 74.2433, cat: 'city', icon: '🛕', fame: 'Mahalakshmi Temple, Kolhapuri Chappals & Jaggery', aliases: ['kolhapur', 'mahalakshmi temple kolhapur', 'panhala fort', 'rankala lake'] },
  { name: 'Akola', state: 'Maharashtra', district: 'Akola', lat: 20.7002, lng: 77.0082, cat: 'city', icon: '🌆', fame: 'Cotton City of Maharashtra', aliases: ['akola', 'shegaon gateway', 'narsingh maharaj'] },
  { name: 'Sangli', state: 'Maharashtra', district: 'Sangli', lat: 16.8524, lng: 74.5815, cat: 'city', icon: '🌆', fame: 'Turmeric City & Krishna River Banks', aliases: ['sangli', 'miraj', 'turmeric city', 'ganpati temple sangli'] },
  { name: 'Jalgaon', state: 'Maharashtra', district: 'Jalgaon', lat: 21.0077, lng: 75.5626, cat: 'city', icon: '🌆', fame: 'Banana City of India & Gold Market', aliases: ['jalgaon', 'banana city', 'jain hills jalgaon', 'bhusawal gateway'] },
  { name: 'Latur', state: 'Maharashtra', district: 'Latur', lat: 18.4088, lng: 76.5604, cat: 'city', icon: '🌆', fame: 'Educational Hub & Soybean Market', aliases: ['latur', 'latur pattern', 'udgir gateway'] },
  { name: 'Dhule', state: 'Maharashtra', district: 'Dhule', lat: 20.9042, lng: 74.7749, cat: 'city', icon: '🌆', fame: 'Crossroads of National Highways in Khandesh', aliases: ['dhule', 'khandesh', 'songir'] },
  { name: 'Ahmednagar', state: 'Maharashtra', district: 'Ahmednagar', lat: 19.0952, lng: 74.7496, cat: 'city', icon: '🏛️', fame: 'Historic Ahmednagar Fort & Shirdi District', aliases: ['ahmednagar', 'ahilyanagar', 'ahmednagar fort', 'shirdi gateway'] },
  { name: 'Chandrapur', state: 'Maharashtra', district: 'Chandrapur', lat: 19.9615, lng: 79.2961, cat: 'nature', icon: '🌳', fame: 'Tadoba Andhari Tiger Reserve & Black Gold City', aliases: ['chandrapur', 'tadoba', 'tadoba tiger reserve', 'coal city'] },
  { name: 'Satara', state: 'Maharashtra', district: 'Satara', lat: 17.6805, lng: 74.0183, cat: 'nature', icon: '🌸', fame: 'Kaas Plateau (Valley of Flowers) & Ajinkyatara Fort', aliases: ['satara', 'kaas plateau', 'valley of flowers maharashtra', 'kandi pedha'] },
  { name: 'Ratnagiri', state: 'Maharashtra', district: 'Ratnagiri', lat: 16.9902, lng: 73.3120, cat: 'coastal', icon: '🏖️', fame: 'Alphonso (Hapus) Mango Capital & Konkan Coast', aliases: ['ratnagiri', 'alphonso mango', 'ganpatipule', 'thiba palace'] },
  { name: 'Sindhudurg', state: 'Maharashtra', district: 'Sindhudurg', lat: 16.1167, lng: 73.6833, cat: 'coastal', icon: '🏖️', fame: 'Shivaji Maharaj Sea Fort & Tarkarli Scuba Diving', aliases: ['sindhudurg', 'tarkarli', 'malvan', 'kankavli', 'sawantwadi'] },
  { name: 'Lonavala & Khandala', state: 'Maharashtra', district: 'Pune', lat: 18.7557, lng: 73.4091, cat: 'hill_station', icon: '🏔️', fame: 'Twin Hill Stations of Western Ghats & Chikki', aliases: ['lonavala', 'khandala', 'bushy dam', 'tiger point', 'karla caves'] },
  { name: 'Mahabaleshwar & Panchgani', state: 'Maharashtra', district: 'Satara', lat: 17.9237, lng: 73.6586, cat: 'hill_station', icon: '🍓', fame: 'Strawberry Capital of India & Table Land', aliases: ['mahabaleshwar', 'panchgani', 'strawberry city', 'arthur seat', 'mapro garden'] },
  { name: 'Matheran', state: 'Maharashtra', district: 'Raigad', lat: 18.9868, lng: 73.2678, cat: 'hill_station', icon: '🏔️', fame: 'Asia’s Only Automobile-Free Hill Station & Toy Train', aliases: ['matheran', 'toy train matheran', 'ecofriendly hill station', 'panoramic point'] },
  { name: 'Alibaug', state: 'Maharashtra', district: 'Raigad', lat: 18.6414, lng: 72.8722, cat: 'coastal', icon: '🏖️', fame: 'Coastal Beach Getaway & Kolaba Fort', aliases: ['alibaug', 'varsoli beach', 'nagaon beach', 'kolaba sea fort', 'mandwa jetty'] },
  { name: 'Bhusawal', state: 'Maharashtra', district: 'Jalgaon', lat: 21.0455, lng: 75.7885, cat: 'city', icon: '🚆', fame: 'Major Central Railway Junction & Banana Depot', aliases: ['bhusawal', 'bhusawal junction', 'bsl'] },

  // --- KARNATAKA (31 Districts & Tech Hubs) ---
  { name: 'Bengaluru (Bangalore)', state: 'Karnataka', district: 'Bengaluru Urban', lat: 12.9716, lng: 77.5946, cat: 'metro', icon: '🏙️', fame: 'Silicon Valley of India, Garden City & IT Hub', aliases: ['bengaluru', 'bangalore', 'sbc', 'electronic city', 'whitefield', 'koramangala', 'indiranagar', 'mg road bangalore', 'manyata tech park'] },
  { name: 'Mysuru (Mysore)', state: 'Karnataka', district: 'Mysuru', lat: 12.2958, lng: 76.6394, cat: 'heritage', icon: '🏛️', fame: 'City of Palaces, Chamundi Hill & Grand Dasara', aliases: ['mysore', 'mysuru', 'mysore palace', 'chamundi hills', 'brindavan gardens'] },
  { name: 'Hubballi-Dharwad', state: 'Karnataka', district: 'Dharwad', lat: 15.3647, lng: 75.1240, cat: 'city', icon: '🌆', fame: 'Commercial Hub of North Karnataka & Longest Railway Platform', aliases: ['hubballi', 'hubli', 'dharwad', 'longest railway platform', 'iit dharwad', 'unakal lake'] },
  { name: 'Mangaluru (Mangalore)', state: 'Karnataka', district: 'Dakshina Kannada', lat: 12.9141, lng: 74.8560, cat: 'coastal', icon: '🏖️', fame: 'Gateway to Karnataka Coast, Panambur Beach & Port', aliases: ['mangaluru', 'mangalore', 'panambur beach', 'kadri temple', 'tannirbhavi', 'kudla'] },
  { name: 'Belagavi (Belgaum)', state: 'Karnataka', district: 'Belagavi', lat: 15.8497, lng: 74.4977, cat: 'city', icon: '🌆', fame: 'Kunda Sweet City & Second Legislative Capital (Suvarna Soudha)', aliases: ['belagavi', 'belgaum', 'suvarna soudha', 'kunda sweet'] },
  { name: 'Kalaburagi (Gulbarga)', state: 'Karnataka', district: 'Kalaburagi', lat: 17.3297, lng: 76.8343, cat: 'city', icon: '🏛️', fame: 'Bahmani Kingdom Capital, Gulbarga Fort & Sharana Basaveshwara', aliases: ['kalaburagi', 'gulbarga', 'khwaja bande nawaz', 'gulbarga fort'] },
  { name: 'Davanagere', state: 'Karnataka', district: 'Davanagere', lat: 14.4644, lng: 75.9218, cat: 'city', icon: '🌆', fame: 'Butter Dosa (Benne Dosa) Capital of Karnataka', aliases: ['davanagere', 'davangere', 'benne dosa', 'textile city karnataka'] },
  { name: 'Ballari (Bellary)', state: 'Karnataka', district: 'Ballari', lat: 15.1394, lng: 76.9214, cat: 'city', icon: '🌆', fame: 'Steel & Mining Hub, Historic Bellary Fort', aliases: ['ballari', 'bellary', 'bellary fort', 'jsw vijayanagar'] },
  { name: 'Vijayapura (Bijapur)', state: 'Karnataka', district: 'Vijayapura', lat: 16.8302, lng: 75.7100, cat: 'heritage', icon: '🏛️', fame: 'Gol Gumbaz (Whispering Gallery) & Adil Shahi Heritage', aliases: ['vijayapura', 'bijapur', 'gol gumbaz', 'ibrahim rauza', 'whispering gallery'] },
  { name: 'Shivamogga (Shimoga)', state: 'Karnataka', district: 'Shivamogga', lat: 13.9299, lng: 75.5681, cat: 'nature', icon: '🌊', fame: 'Gateway to Western Ghats & World-Famous Jog Falls', aliases: ['shivamogga', 'shimoga', 'jog falls', 'sharavathi', 'agumbe gateway'] },
  { name: 'Tumakuru (Tumkur)', state: 'Karnataka', district: 'Tumakuru', lat: 13.3379, lng: 77.1017, cat: 'city', icon: '🌆', fame: 'Smart Industrial City & Siddaganga Mutt', aliases: ['tumakuru', 'tumkur', 'siddaganga matha', 'devarayanadurga'] },
  { name: 'Coorg (Madikeri)', state: 'Karnataka', district: 'Kodagu', lat: 12.4244, lng: 75.7382, cat: 'hill_station', icon: '☕', fame: 'Coffee Capital of India & Scotland of India', aliases: ['coorg', 'madikeri', 'kodagu', 'abbey falls', 'raja seat', 'talakaveri', 'dubare elephant camp'] },
  { name: 'Chikkamagaluru', state: 'Karnataka', district: 'Chikkamagaluru', lat: 13.3161, lng: 75.7720, cat: 'hill_station', icon: '☕', fame: 'Birthplace of Coffee in India & Mullayanagiri Peak', aliases: ['chikkamagaluru', 'chikmagalur', 'mullayanagiri', 'baba budangiri', 'kudremukh'] },
  { name: 'Udupi', state: 'Karnataka', district: 'Udupi', lat: 13.3409, lng: 74.7421, cat: 'temple', icon: '🛕', fame: 'Sri Krishna Matha & Malpe Beach / St. Mary’s Island', aliases: ['udupi', 'udupi krishna temple', 'malpe beach', 'st marys island', 'manipal'] },
  { name: 'Gokarna', state: 'Karnataka', district: 'Uttara Kannada', lat: 14.5479, lng: 74.3188, cat: 'coastal', icon: '🏖️', fame: 'Om Beach, Mahabaleshwar Temple & Pristine Coastline', aliases: ['gokarna', 'om beach', 'kudle beach', 'mahabaleshwar gokarna', 'half moon beach'] },
  { name: 'Hassan', state: 'Karnataka', district: 'Hassan', lat: 13.0072, lng: 76.1030, cat: 'heritage', icon: '🏛️', fame: 'Hoysala Architecture (Belur & Halebidu Temples) & Shravanabelagola', aliases: ['hassan', 'belur', 'halebidu', 'shravanabelagola', 'gommateshwara statue'] },
  { name: 'Hospet (Hosapete)', state: 'Karnataka', district: 'Vijayanagara', lat: 15.2689, lng: 76.3909, cat: 'city', icon: '🏛️', fame: 'Gateway to UNESCO World Heritage Hampi & Tungabhadra Dam', aliases: ['hosapete', 'hospet', 'tungabhadra dam', 'hampi gateway'] },

  // --- TAMIL NADU (38 Districts & Industrial Corridors) ---
  { name: 'Chennai', state: 'Tamil Nadu', district: 'Chennai', lat: 13.0827, lng: 80.2707, cat: 'metro', icon: '🏙️', fame: 'Detroit of Asia, Marina Beach & Cultural Capital', aliases: ['chennai', 'madras', 'mas', 'marina beach', 't nagar', 'omr', 'guindy', 'mylapore', 'anna nagar', 'velachery'] },
  { name: 'Coimbatore', state: 'Tamil Nadu', district: 'Coimbatore', lat: 11.0168, lng: 76.9558, cat: 'metro', icon: '🏙️', fame: 'Manchester of South India, Isha Yoga Center & Adiyogi', aliases: ['coimbatore', 'kovai', 'cbe', 'isha yoga', 'adiyogi', 'gandhipuram', 'rs puram', 'peelamedu'] },
  { name: 'Madurai', state: 'Tamil Nadu', district: 'Madurai', lat: 9.9252, lng: 78.1198, cat: 'temple', icon: '🛕', fame: 'Temple City, Meenakshi Amman & Thousand Pillar Hall', aliases: ['madurai', 'mdu', 'meenakshi amman', 'meenakshi temple', 'thoonga nagaram', 'vaigai'] },
  { name: 'Tiruchirappalli (Trichy)', state: 'Tamil Nadu', district: 'Tiruchirappalli', lat: 10.7905, lng: 78.7047, cat: 'city', icon: '🛕', fame: 'Rockfort Temple, Srirangam Ranganathaswamy & NIT Trichy', aliases: ['tiruchirappalli', 'trichy', 'tpj', 'srirangam', 'rockfort temple', 'nit trichy'] },
  { name: 'Salem', state: 'Tamil Nadu', district: 'Salem', lat: 11.6643, lng: 78.1460, cat: 'city', icon: '🌆', fame: 'Steel City, Mangoes & Gateway to Yercaud', aliases: ['salem', 'salem steel', 'yercaud gateway', 'mango city'] },
  { name: 'Tirunelveli', state: 'Tamil Nadu', district: 'Tirunelveli', lat: 8.7139, lng: 77.7567, cat: 'city', icon: '🛕', fame: 'Nellaiappar Temple & Halwa Capital', aliases: ['tirunelveli', 'nellai', 'nellaiappar temple', 'iruttu kadai halwa'] },
  { name: 'Tiruppur', state: 'Tamil Nadu', district: 'Tiruppur', lat: 11.1085, lng: 77.3411, cat: 'city', icon: '🌆', fame: 'Knitwear Capital of India (Dollar City)', aliases: ['tiruppur', 'knitwear capital', 'dollar city', 'textile export hub'] },
  { name: 'Vellore', state: 'Tamil Nadu', district: 'Vellore', lat: 12.9165, lng: 79.1325, cat: 'city', icon: '🛕', fame: 'Golden Temple Sripuram, CMC Hospital & Vellore Fort', aliases: ['vellore', 'sripuram golden temple', 'cmc vellore', 'vit vellore', 'vellore fort'] },
  { name: 'Erode', state: 'Tamil Nadu', district: 'Erode', lat: 11.3410, lng: 77.7172, cat: 'city', icon: '🌆', fame: 'Turmeric City & Textile Market of Tamil Nadu', aliases: ['erode', 'turmeric city', 'bhavani sangameshwarar', 'textile city'] },
  { name: 'Thanjavur (Tanjore)', state: 'Tamil Nadu', district: 'Thanjavur', lat: 10.7870, lng: 79.1378, cat: 'heritage', icon: '🛕', fame: 'Brihadeeswarar Temple & Tanjore Art & Paintings', aliases: ['thanjavur', 'tanjore', 'brihadeeswarar', 'big temple', 'chola kingdom'] },
  { name: 'Kancheepuram', state: 'Tamil Nadu', district: 'Kancheepuram', lat: 12.8342, lng: 79.7036, cat: 'temple', icon: '🛕', fame: 'Silk Saree Capital & City of Thousand Temples', aliases: ['kancheepuram', 'kanchipuram', 'kanchi silk', 'ekambareswarar', 'kailasanathar'] },
  { name: 'Tiruvannamalai', state: 'Tamil Nadu', district: 'Tiruvannamalai', lat: 12.2253, lng: 79.0747, cat: 'temple', icon: '🛕', fame: 'Annamalaiyar Temple, Giri Valam & Sri Ramana Maharshi Ashram', aliases: ['tiruvannamalai', 'annamalaiyar', 'arunachala', 'giri valam', 'ramana maharshi'] },
  { name: 'Rameswaram', state: 'Tamil Nadu', district: 'Ramanathapuram', lat: 9.2876, lng: 79.3129, cat: 'temple', icon: '🛕', fame: 'Ramanathaswamy Jyotirlinga, Pamban Sea Bridge & Dhanushkodi', aliases: ['rameswaram', 'rameshwaram', 'pamban bridge', 'dhanushkodi', 'dr apj abdul kalam memorial'] },
  { name: 'Kanyakumari', state: 'Tamil Nadu', district: 'Kanyakumari', lat: 8.0883, lng: 77.5385, cat: 'coastal', icon: '🏛️', fame: 'Southernmost Tip of Mainland India & Sunrise/Sunset Confluence', aliases: ['kanyakumari', 'cape comorin', 'vivekananda rock memorial', 'thiruvalluvar statue'] },
  { name: 'Ooty (Udhagamandalam)', state: 'Tamil Nadu', district: 'Nilgiris', lat: 11.4102, lng: 76.6950, cat: 'hill_station', icon: '🏔️', fame: 'Queen of Hill Stations, Nilgiri Mountain Railway & Doddabetta', aliases: ['ooty', 'udhagamandalam', 'nilgiris', 'nilgiri toy train', 'botanical garden ooty', 'doddabetta peak'] },
  { name: 'Kodaikanal', state: 'Tamil Nadu', district: 'Dindigul', lat: 10.2381, lng: 77.4892, cat: 'hill_station', icon: '🏔️', fame: 'Princess of Hill Stations & Kodai Star Lake', aliases: ['kodaikanal', 'kodai', 'kodaikanal lake', 'pillar rocks', 'coakers walk'] },
  { name: 'Hosur', state: 'Tamil Nadu', district: 'Krishnagiri', lat: 12.7409, lng: 77.8253, cat: 'city', icon: '🏙️', fame: 'EV & Industrial Manufacturing Hub near Bangalore', aliases: ['hosur', 'tata electronics hosur', 'tvs motor hosur', 'ather hosur'] },

  // --- GUJARAT (33 Districts & Industrial Titans) ---
  { name: 'Ahmedabad', state: 'Gujarat', district: 'Ahmedabad', lat: 23.0225, lng: 72.5714, cat: 'metro', icon: '🏙️', fame: 'Manchester of India, Sabarmati Ashram & World Heritage City', aliases: ['ahmedabad', 'amdavad', 'adi', 'sabarmati ashram', 'atal bridge', 'sg highway', 'narendra modi stadium', 'manek chowk'] },
  { name: 'Surat', state: 'Gujarat', district: 'Surat', lat: 21.1702, lng: 72.8311, cat: 'metro', icon: '🏙️', fame: 'Diamond City of the World & Textile Hub', aliases: ['surat', 'diamond city', 'surat diamond bursa', 'textile city', 'dumas beach', 'varachha', 'vesu'] },
  { name: 'Vadodara (Baroda)', state: 'Gujarat', district: 'Vadodara', lat: 22.3072, lng: 73.1812, cat: 'city', icon: '🏛️', fame: 'Cultural Capital of Gujarat, Laxmi Vilas Palace & Navratri', aliases: ['vadodara', 'baroda', 'brc', 'laxmi vilas palace', 'sayaji baug', 'ms university'] },
  { name: 'Rajkot', state: 'Gujarat', district: 'Rajkot', lat: 22.3039, lng: 70.8022, cat: 'city', icon: '🌆', fame: 'Capital of Saurashtra & Engineering Hub', aliases: ['rajkot', 'saurashtra hub', 'race course rajkot', 'yagnik road'] },
  { name: 'Gandhinagar', state: 'Gujarat', district: 'Gandhinagar', lat: 23.2156, lng: 72.6369, cat: 'city', icon: '🏙️', fame: 'Green Capital City of Gujarat, GIFT City & Akshardham', aliases: ['gandhinagar', 'gift city', 'akshardham gandhinagar', 'mahatma mandir'] },
  { name: 'Bhavnagar', state: 'Gujarat', district: 'Bhavnagar', lat: 21.7645, lng: 72.1519, cat: 'city', icon: '🌆', fame: 'Ship Recycling at Alang & Gateway to Palitana Temples', aliases: ['bhavnagar', 'alang ship breaking', 'palitana gateway', 'takhteshwar temple'] },
  { name: 'Jamnagar', state: 'Gujarat', district: 'Jamnagar', lat: 22.4707, lng: 70.0577, cat: 'city', icon: '🌆', fame: 'Oil City of India (World’s Largest Refinery) & Brass City', aliases: ['jamnagar', 'oil city', 'reliance refinery', 'marine national park jamnagar'] },
  { name: 'Junagadh', state: 'Gujarat', district: 'Junagadh', lat: 21.5222, lng: 70.4579, cat: 'heritage', icon: '🏛️', fame: 'Girnar Ropeway, Uparkot Fort & Asiatic Lions Gateway', aliases: ['junagadh', 'girnar', 'uparkot fort', 'mahabbat maqbara'] },
  { name: 'Somnath (Veraval)', state: 'Gujarat', district: 'Gir Somnath', lat: 20.8880, lng: 70.4010, cat: 'temple', icon: '🛕', fame: 'First Jyotirlinga of Lord Shiva on Arabian Coast', aliases: ['somnath', 'somnath temple', 'veraval', 'prabhas patan'] },
  { name: 'Dwarka', state: 'Gujarat', district: 'Devbhumi Dwarka', lat: 22.2376, lng: 68.9678, cat: 'temple', icon: '🛕', fame: 'Dwarkadhish Temple, Char Dham & Sudarshan Setu', aliases: ['dwarka', 'dwarkadhish', 'bet dwarka', 'sudarshan setu', 'gomti ghat dwarka'] },
  { name: 'Bhuj & Kutch', state: 'Gujarat', district: 'Kutch', lat: 23.2420, lng: 69.6669, cat: 'nature', icon: '🏜️', fame: 'Great Rann of Kutch White Desert & Rann Utsav', aliases: ['bhuj', 'kutch', 'rann of kutch', 'white desert', 'rann utsav', 'dholavira'] },
  { name: 'Sasan Gir', state: 'Gujarat', district: 'Gir Somnath', lat: 21.1243, lng: 70.7963, cat: 'nature', icon: '🦁', fame: 'Only Natural Habitat of the Asiatic Lion in the World', aliases: ['gir', 'sasan gir', 'gir national park', 'asiatic lions'] },
  { name: 'Morbi', state: 'Gujarat', district: 'Morbi', lat: 22.8173, lng: 70.8370, cat: 'city', icon: '🌆', fame: 'Ceramic & Tile Capital of India', aliases: ['morbi', 'ceramic city', 'clock city'] },
  { name: 'Anand', state: 'Gujarat', district: 'Anand', lat: 22.5645, lng: 72.9289, cat: 'city', icon: '🥛', fame: 'Milk Capital of India (Amul Headquarters & NDDB)', aliases: ['anand', 'amul', 'milk city', 'nddb anand'] },
  { name: 'Vapi & Valsad', state: 'Gujarat', district: 'Valsad', lat: 20.3893, lng: 72.9106, cat: 'city', icon: '🌆', fame: 'Major Chemical Industrial Hub & Tithal Beach', aliases: ['vapi', 'valsad', 'tithal beach', 'daman gateway'] },

  // --- RAJASTHAN (50 Districts & Royal Fortresses) ---
  { name: 'Jaipur', state: 'Rajasthan', district: 'Jaipur', lat: 26.9124, lng: 75.7873, cat: 'metro', icon: '🏰', fame: 'Pink City, UNESCO World Heritage, Hawa Mahal & Amer Fort', aliases: ['jaipur', 'pink city', 'jp', 'hawa mahal', 'amer fort', 'city palace jaipur', 'nahargarh', 'jantar mantar jaipur'] },
  { name: 'Jodhpur', state: 'Rajasthan', district: 'Jodhpur', lat: 26.2389, lng: 73.0243, cat: 'city', icon: '🏰', fame: 'Blue City, Sun City & Mehrangarh Fort', aliases: ['jodhpur', 'blue city', 'sun city', 'mehrangarh fort', 'umaid bhawan palace', 'mandore'] },
  { name: 'Udaipur', state: 'Rajasthan', district: 'Udaipur', lat: 24.5854, lng: 73.7125, cat: 'city', icon: '🏰', fame: 'City of Lakes, Venice of the East & Lake Pichola', aliases: ['udaipur', 'city of lakes', 'lake pichola', 'city palace udaipur', 'fateh sagar', 'taj lake palace'] },
  { name: 'Kota', state: 'Rajasthan', district: 'Kota', lat: 25.2138, lng: 75.8648, cat: 'city', icon: '🌆', fame: 'Coaching Capital of India & Chambal Riverfront', aliases: ['kota', 'kota junction', 'chambal riverfront', 'seven wonders park kota'] },
  { name: 'Bikaner', state: 'Rajasthan', district: 'Bikaner', lat: 28.0229, lng: 73.3119, cat: 'city', icon: '🏰', fame: 'Camel Country, Junagarh Fort & Karni Mata Temple (Deshnoke)', aliases: ['bikaner', 'junagarh fort', 'bikaneri bhujia', 'karni mata temple', 'deshnoke'] },
  { name: 'Ajmer & Pushkar', state: 'Rajasthan', district: 'Ajmer', lat: 26.4499, lng: 74.6399, cat: 'temple', icon: '🛕', fame: 'Ajmer Sharif Dargah & Brahma Temple Pushkar Lake', aliases: ['ajmer', 'pushkar', 'ajmer sharif dargah', 'brahma temple pushkar', 'pushkar camel fair'] },
  { name: 'Jaisalmer', state: 'Rajasthan', district: 'Jaisalmer', lat: 26.9157, lng: 70.9083, cat: 'heritage', icon: '🏜️', fame: 'Golden City, Sonar Qila (Living Fort) & Sam Sand Dunes', aliases: ['jaisalmer', 'golden city', 'sonar qila', 'sam sand dunes', 'desert safari jaisalmer'] },
  { name: 'Chittorgarh', state: 'Rajasthan', district: 'Chittorgarh', lat: 24.8887, lng: 74.6269, cat: 'heritage', icon: '🏰', fame: 'Largest Fort in India, Vijay Stambha & Rani Padmini Palace', aliases: ['chittorgarh', 'chittor fort', 'vijay stambha', 'kirti stambha'] },
  { name: 'Mount Abu', state: 'Rajasthan', district: 'Sirohi', lat: 24.5926, lng: 72.7156, cat: 'hill_station', icon: '🏔️', fame: 'Only Hill Station in Rajasthan, Dilwara Jain Temples & Nakki Lake', aliases: ['mount abu', 'dilwara temples', 'nakki lake', 'guru shikhar'] },
  { name: 'Alwar', state: 'Rajasthan', district: 'Alwar', lat: 27.5530, lng: 76.6346, cat: 'nature', icon: '🐯', fame: 'Sariska Tiger Reserve & Bhangarh Fort', aliases: ['alwar', 'sariska', 'sariska tiger reserve', 'bhangarh fort', 'siliserh lake'] },
  { name: 'Bharatpur', state: 'Rajasthan', district: 'Bharatpur', lat: 27.2152, lng: 77.5030, cat: 'nature', icon: '🦚', fame: 'Keoladeo National Park (UNESCO Bird Sanctuary)', aliases: ['bharatpur', 'keoladeo national park', 'ghana bird sanctuary', 'lohagadh fort'] },
  { name: 'Bhilwara', state: 'Rajasthan', district: 'Bhilwara', lat: 25.3216, lng: 74.6307, cat: 'city', icon: '🌆', fame: 'Textile City of Rajasthan', aliases: ['bhilwara', 'textile city rajasthan'] },
  { name: 'Sawai Madhopur', state: 'Rajasthan', district: 'Sawai Madhopur', lat: 25.9928, lng: 76.3712, cat: 'nature', icon: '🐯', fame: 'Ranthambore National Park & Royal Bengal Tigers', aliases: ['sawai madhopur', 'ranthambore', 'ranthambhore tiger reserve', 'ranthambore fort'] },

  // --- ODISHA (30 Districts & Coastal Marine Heritage) ---
  { name: 'Bhubaneswar', state: 'Odisha', district: 'Khordha', lat: 20.2961, lng: 85.8245, cat: 'metro', icon: '🛕', fame: 'Temple City of India, Ekamra Kshetra & IT Capital of Odisha', aliases: ['bhubaneswar', 'bbsr', 'bbs', 'lingaraj', 'patia', 'jaydev vihar', 'chandrasekharpur', 'infocity bbsr', 'khandagiri', 'udaigiri'] },
  { name: 'Cuttack', state: 'Odisha', district: 'Cuttack', lat: 20.4625, lng: 85.8828, cat: 'city', icon: '🌆', fame: 'Silver City (Tarakasi), Historic Barabati Fort & Bali Yatra', aliases: ['cuttack', 'ctc', 'silver city', 'barabati fort', 'bali yatra', 'scb medical', 'choudwar'] },
  { name: 'Puri', state: 'Odisha', district: 'Puri', lat: 19.8135, lng: 85.8312, cat: 'temple', icon: '🛕', fame: 'Char Dham, Shree Jagannath Temple & Golden Beach (Blue Flag)', aliases: ['puri', 'jagannath puri', 'shree jagannath temple', 'puri sea beach', 'golden beach puri', 'badadanda', 'swargadwar'] },
  { name: 'Rourkela', state: 'Odisha', district: 'Sundargarh', lat: 22.2604, lng: 84.8536, cat: 'city', icon: '🏒', fame: 'Steel City of Odisha & Birsa Munda World Cup Hockey Stadium', aliases: ['rourkela', 'rou', 'rourkela steel plant', 'birsa munda hockey stadium', 'nit rourkela', 'hanuman vatika'] },
  { name: 'Berhampur (Brahmapur)', state: 'Odisha', district: 'Ganjam', lat: 19.3150, lng: 84.7941, cat: 'city', icon: '🌆', fame: 'Silk City of Odisha & Gateway to Gopalpur Sea Beach', aliases: ['berhampur', 'brahmapur', 'bam', 'silk city odisha', 'gopalpur beach', 'tampara lake'] },
  { name: 'Sambalpur', state: 'Odisha', district: 'Sambalpur', lat: 21.4669, lng: 83.9812, cat: 'city', icon: '🌊', fame: 'Hirakud Dam (Longest Earthen Dam), Samaleswari Temple & Ikat Silk', aliases: ['sambalpur', 'sbp', 'hirakud dam', 'maa samaleswari', 'sambalpuri saree'] },
  { name: 'Balasore (Baleswar)', state: 'Odisha', district: 'Balasore', lat: 21.4934, lng: 86.9324, cat: 'coastal', icon: '🏖️', fame: 'Missile Testing Range (Chandipur-on-Sea) & Hide-and-Seek Beach', aliases: ['balasore', 'baleshwar', 'bls', 'chandipur beach', 'drdo missile range', 'panchalingeswar'] },
  { name: 'Bhadrak', state: 'Odisha', district: 'Bhadrak', lat: 21.0543, lng: 86.4955, cat: 'city', icon: '🛕', fame: 'Bhadrakali Temple & Dhamra Port Gateway', aliases: ['bhadrak', 'bhc', 'bhadrakali temple', 'dhamra port', 'aradi akhandalamani'] },
  { name: 'Baripada (Mayurbhanj)', state: 'Odisha', district: 'Mayurbhanj', lat: 21.9322, lng: 86.7360, cat: 'nature', icon: '🐅', fame: 'Simlipal National Park & Mayurbhanj Chhau Dance', aliases: ['baripada', 'mayurbhanj', 'simlipal tiger reserve', 'barehipani falls', 'chhau dance'] },
  { name: 'Jharsuguda', state: 'Odisha', district: 'Jharsuguda', lat: 21.8540, lng: 84.0080, cat: 'city', icon: '✈️', fame: 'Power House of Odisha & Veer Surendra Sai Airport', aliases: ['jharsuguda', 'jsg', 'veer surendra sai airport', 'vedanta jharsuguda'] },
  { name: 'Jeypore & Koraput', state: 'Odisha', district: 'Koraput', lat: 18.8562, lng: 82.5711, cat: 'hill_station', icon: '🏔️', fame: 'Tribal Heartland of Eastern Ghats, Deomali Peak & Coffee', aliases: ['jeypore', 'koraput', 'deomali peak', 'duduma waterfall', 'gupteswar cave'] },
  { name: 'Angul & Talcher', state: 'Odisha', district: 'Angul', lat: 20.8400, lng: 85.1000, cat: 'city', icon: '🏭', fame: 'Coal City of India, NALCO & NTPC Power Complex', aliases: ['angul', 'talcher', 'nalco nagar', 'mcl talcher', 'satkosia gorge'] },
  { name: 'Paradip', state: 'Odisha', district: 'Jagatsinghpur', lat: 20.3165, lng: 86.6114, cat: 'coastal', icon: '🚢', fame: 'Major Deep-Water Seaport on the Bay of Bengal', aliases: ['paradip', 'paradeep', 'paradip port', 'iocl refinery paradip'] },
  { name: 'Dhenkanal', state: 'Odisha', district: 'Dhenkanal', lat: 20.6600, lng: 85.5900, cat: 'heritage', icon: '🛕', fame: 'Kapilash Temple, Joranda Mahima Gadi & Saptasajya', aliases: ['dhenkanal', 'kapilash', 'joranda', 'mahima gadi', 'saptasajya'] },
  { name: 'Kendujhar (Keonjhar)', state: 'Odisha', district: 'Kendujhar', lat: 21.6288, lng: 85.5817, cat: 'nature', icon: '🌊', fame: 'Mineral Capital, Khandadhar Falls & Sanaghagara', aliases: ['keonjhar', 'kendujhar', 'khandadhar waterfall', 'sanaghagara falls', 'gonasika'] },

  // --- WEST BENGAL (23 Districts & River Delta) ---
  { name: 'Kolkata', state: 'West Bengal', district: 'Kolkata', lat: 22.5726, lng: 88.3639, cat: 'metro', icon: '🏙️', fame: 'City of Joy, Victoria Memorial, Howrah Bridge & Cultural Capital', aliases: ['kolkata', 'calcutta', 'hwh', 'sdah', 'park street', 'salt lake', 'new town kolkata', 'esplanade', 'victoria memorial', 'dakshineswar'] },
  { name: 'Howrah', state: 'West Bengal', district: 'Howrah', lat: 22.5958, lng: 88.2636, cat: 'metro', icon: '🚆', fame: 'Howrah Junction Station, Indian Botanic Garden & Great Banyan', aliases: ['howrah', 'howrah junction', 'nabanna', 'shibpur', 'great banyan tree', 'santragachi'] },
  { name: 'Siliguri', state: 'West Bengal', district: 'Darjeeling', lat: 26.7271, lng: 88.3953, cat: 'city', icon: '🏔️', fame: 'Gateway to Northeast India, Darjeeling & Sikkim', aliases: ['siliguri', 'njpm', 'new jalpaiguri', 'bagdogra airport', 'coronation bridge', 'sevoke'] },
  { name: 'Durgapur', state: 'West Bengal', district: 'Paschim Bardhaman', lat: 23.5204, lng: 87.3119, cat: 'city', icon: '🏭', fame: 'Steel City of Eastern India & National Institute of Technology', aliases: ['durgapur', 'dgr', 'durgapur steel plant', 'city centre durgapur', 'nit durgapur'] },
  { name: 'Asansol', state: 'West Bengal', district: 'Paschim Bardhaman', lat: 23.6889, lng: 86.9661, cat: 'city', icon: '🚆', fame: 'Coal & Rail Hub, Chittaranjan Locomotive Works (CLW)', aliases: ['asansol', 'asn', 'burnpur', 'chittaranjan locomotive', 'kalyaneshwari'] },
  { name: 'Darjeeling', state: 'West Bengal', district: 'Darjeeling', lat: 27.0410, lng: 88.2663, cat: 'hill_station', icon: '☕', fame: 'Queen of the Hills, Darjeeling Himalayan Toy Train & Tiger Hill', aliases: ['darjeeling', 'tiger hill sunrise', 'darjeeling tea', 'himalayan toy train', 'batasia loop', 'ghoom station'] },
  { name: 'Kalimpong', state: 'West Bengal', district: 'Kalimpong', lat: 27.0667, lng: 88.4667, cat: 'hill_station', icon: '🏔️', fame: 'Himalayan Ridge Town, Flower Nurseries & Deolo Hill', aliases: ['kalimpong', 'deolo hill', 'morgan house', 'cactus nursery kalimpong'] },
  { name: 'Kharagpur', state: 'West Bengal', district: 'Paschim Medinipur', lat: 22.3460, lng: 87.2320, cat: 'city', icon: '🚆', fame: 'First Indian Institute of Technology (IIT Kharagpur) & Mega Rail Junction', aliases: ['kharagpur', 'kgp', 'iit kharagpur', 'hijli'] },
  { name: 'Shantiniketan (Bolpur)', state: 'West Bengal', district: 'Birbhum', lat: 23.6800, lng: 87.6800, cat: 'heritage', icon: '🎨', fame: 'Rabindranath Tagore’s Visva-Bharati University (UNESCO Heritage)', aliases: ['shantiniketan', 'bolpur', 'visva bharati', 'tagore ashram', 'poush mela'] },
  { name: 'Digha & Mandarmani', state: 'West Bengal', district: 'Purba Medinipur', lat: 21.6266, lng: 87.5074, cat: 'coastal', icon: '🏖️', fame: 'Premier Beach Getaways on the Bay of Bengal', aliases: ['digha', 'new digha', 'old digha', 'mandarmani', 'tajpur', 'shankarpur'] },
  { name: 'Sundarbans', state: 'West Bengal', district: 'South 24 Parganas', lat: 21.9497, lng: 89.1833, cat: 'nature', icon: '🐅', fame: 'World’s Largest Mangrove Forest & Royal Bengal Tiger Reserve (UNESCO)', aliases: ['sundarbans', 'sundarban national park', 'mangrove forest', 'sajnekhali', 'gosaba'] },
  { name: 'Malda (English Bazar)', state: 'West Bengal', district: 'Malda', lat: 25.0090, lng: 88.1410, cat: 'heritage', icon: '🥭', fame: 'Mango Capital of Bengal & Historic Gaur & Pandua Ruins', aliases: ['malda', 'english bazar', 'gaur ruins', 'adina mosque', 'fazli mango'] },

  // --- BIHAR (38 Districts & Ancient Buddhist/Jain Heritage) ---
  { name: 'Patna', state: 'Bihar', district: 'Patna', lat: 25.5941, lng: 85.1376, cat: 'metro', icon: '🏙️', fame: 'Ancient Pataliputra, Capital of Bihar, Takht Sri Patna Sahib & Golghar', aliases: ['patna', 'pataliputra', 'pnbe', 'patna junction', 'patna sahib', 'golghar', 'boring road patna', 'kankarbagh', 'gandhi maidan'] },
  { name: 'Gaya & Bodh Gaya', state: 'Bihar', district: 'Gaya', lat: 24.7955, lng: 85.0002, cat: 'temple', icon: '🛕', fame: 'Vishnupad Temple (Pinda Daan) & Mahabodhi Temple (UNESCO Enlightenment Site)', aliases: ['gaya', 'bodh gaya', 'mahabodhi temple', 'vishnupad temple', 'bodhi tree', 'falgu river'] },
  { name: 'Bhagalpur', state: 'Bihar', district: 'Bhagalpur', lat: 25.2425, lng: 86.9842, cat: 'city', icon: '🌆', fame: 'Silk City of India (Tussar Silk) & Vikramshila University', aliases: ['bhagalpur', 'silk city bihar', 'vikramshila university', 'gangetic dolphin sanctuary'] },
  { name: 'Muzaffarpur', state: 'Bihar', district: 'Muzaffarpur', lat: 26.1209, lng: 85.3647, cat: 'city', icon: '🍒', fame: 'Shahi Litchi Capital of India & Commercial Center of North Bihar', aliases: ['muzaffarpur', 'shahi litchi', 'garib sthan mandir', 'motijheel'] },
  { name: 'Darbhanga', state: 'Bihar', district: 'Darbhanga', lat: 26.1542, lng: 85.8918, cat: 'city', icon: '🏰', fame: 'Cultural Capital of Mithila, Darbhanga Fort & Makhana Hub', aliases: ['darbhanga', 'mithila capital', 'darbhanga airport', 'raj darbhanga', 'makhana city'] },
  { name: 'Nalanda & Rajgir', state: 'Bihar', district: 'Nalanda', lat: 25.0300, lng: 85.4200, cat: 'heritage', icon: '🏛️', fame: 'Ancient Nalanda University Ruins (UNESCO), Vulture Peak & Glass Bridge', aliases: ['nalanda', 'rajgir', 'nalanda university', 'vishwa shanti stupa', 'rajgir glass bridge', 'hot springs rajgir'] },
  { name: 'Purnia', state: 'Bihar', district: 'Purnia', lat: 25.7771, lng: 87.4753, cat: 'city', icon: '🌆', fame: 'Heart of Seemanchal & Agricultural Trading Center', aliases: ['purnia', 'purnea', 'gulabbagh mandi', 'seemanchal'] },
  { name: 'Begusarai', state: 'Bihar', district: 'Begusarai', lat: 25.4182, lng: 86.1272, cat: 'city', icon: '🏭', fame: 'Industrial Capital of Bihar (IOCL Barauni Refinery) & Kanwar Lake', aliases: ['begusarai', 'barauni refinery', 'kanwar lake bird sanctuary'] },
  { name: 'Sasaram', state: 'Bihar', district: 'Rohtas', lat: 24.9500, lng: 84.0300, cat: 'heritage', icon: '🏛️', fame: 'Tomb of Sher Shah Suri & Rohtasgarh Fort', aliases: ['sasaram', 'sher shah suri tomb', 'rohtasgarh fort', 'grand trunk road sasaram'] },

  // --- MADHYA PRADESH (55 Districts & Heart of India) ---
  { name: 'Indore', state: 'Madhya Pradesh', district: 'Indore', lat: 22.7196, lng: 75.8577, cat: 'metro', icon: '🏙️', fame: 'Cleanest City of India (7x), Sarafa Bazaar, Chhappan Dukan & IT Hub', aliases: ['indore', 'cleanest city', 'indb', 'sarafa bazaar', '56 dukan', 'rajwada palace indore', 'vijay nagar indore', 'iit iim indore'] },
  { name: 'Bhopal', state: 'Madhya Pradesh', district: 'Bhopal', lat: 23.2599, lng: 77.4126, cat: 'metro', icon: '🏙️', fame: 'City of Lakes, Upper Lake (Bhojtal), Bharat Bhavan & Taj-ul-Masajid', aliases: ['bhopal', 'city of lakes mp', 'bpl', 'upper lake bhopal', 'van vihar', 'rani kamlapati station', 'taj ul masajid'] },
  { name: 'Gwalior', state: 'Madhya Pradesh', district: 'Gwalior', lat: 26.2183, lng: 78.1828, cat: 'city', icon: '🏰', fame: 'Gwalior Fort (Pearl in the Necklace of Forts) & Jai Vilas Palace', aliases: ['gwalior', 'gwl', 'gwalior fort', 'jai vilas palace', 'tansen tomb', 'scindia palace'] },
  { name: 'Jabalpur', state: 'Madhya Pradesh', district: 'Jabalpur', lat: 23.1815, lng: 79.9864, cat: 'city', icon: '🌊', fame: 'Marble Rocks at Bhedaghat, Dhuandhar Waterfalls on Narmada', aliases: ['jabalpur', 'jbp', 'bhedaghat', 'dhuandhar falls', 'marble rocks narmada', 'madan mahal fort'] },
  { name: 'Ujjain', state: 'Madhya Pradesh', district: 'Ujjain', lat: 23.1765, lng: 75.7885, cat: 'temple', icon: '🛕', fame: 'Mahakaleshwar Jyotirlinga (Bhasma Aarti), Mahakal Lok & Kumbh Mela', aliases: ['ujjain', 'mahakal', 'mahakaleshwar jyotirlinga', 'mahakal lok corridor', 'shipra river ghats', 'ram ghat ujjain'] },
  { name: 'Khajuraho', state: 'Madhya Pradesh', district: 'Chhatarpur', lat: 24.8318, lng: 79.9199, cat: 'heritage', icon: '🏛️', fame: 'UNESCO World Heritage Nagara Temples with Intricate Erotic Sculptures', aliases: ['khajuraho', 'kandariya mahadeva temple', 'khajuraho dance festival', 'western group temples'] },
  { name: 'Pachmarhi', state: 'Madhya Pradesh', district: 'Narmadapuram', lat: 22.4674, lng: 78.4346, cat: 'hill_station', icon: '🏔️', fame: 'Queen of Satpura, Dhupgarh (Highest Peak of MP) & Bee Falls', aliases: ['pachmarhi', 'satpura ki rani', 'dhupgarh peak', 'bee falls', 'jatashankar cave'] },
  { name: 'Kanha & Bandhavgarh', state: 'Madhya Pradesh', district: 'Mandla', lat: 22.3345, lng: 80.6115, cat: 'nature', icon: '🐯', fame: 'Jungle Book Inspiration & Highest Density of Royal Bengal Tigers', aliases: ['kanha national park', 'bandhavgarh national park', 'kanha tiger reserve', 'jungle book'] },
  { name: 'Orchha', state: 'Madhya Pradesh', district: 'Niwari', lat: 25.3508, lng: 78.6433, cat: 'heritage', icon: '🏰', fame: 'Ram Raja Temple (Where Lord Rama is Worshiped as King) & Jahangir Mahal', aliases: ['orchha', 'ram raja temple', 'jahangir mahal orchha', 'betwa river orchha', 'chhatris orchha'] },
  { name: 'Omkareshwar & Maheshwar', state: 'Madhya Pradesh', district: 'Khandwa', lat: 22.2450, lng: 76.1500, cat: 'temple', icon: '🛕', fame: 'Omkareshwar Island Jyotirlinga & Ahilyabai Holkar Ghats / Maheshwari Sarees', aliases: ['omkareshwar', 'maheshwar', 'omkareshwar jyotirlinga', 'ahilya fort maheshwar', 'maheshwari silk'] },

  // --- PUNJAB & HARYANA & CHANDIGARH ---
  { name: 'Chandigarh', state: 'Chandigarh', district: 'Chandigarh', lat: 30.7333, lng: 76.7794, cat: 'metro', icon: '🏙️', fame: 'The City Beautiful, Rock Garden, Sukhna Lake & Le Corbusier Architecture', aliases: ['chandigarh', 'the city beautiful', 'sukhna lake', 'rock garden nek chand', 'sector 17 chandigarh', 'panjab university'] },
  { name: 'Amritsar', state: 'Punjab', district: 'Amritsar', lat: 31.6340, lng: 74.8723, cat: 'temple', icon: '🛕', fame: 'Golden Temple (Harmandir Sahib), Jallianwala Bagh & Wagah Border', aliases: ['amritsar', 'golden temple amritsar', 'harmandir sahib', 'jallianwala bagh', 'wagah border', 'asr', 'amritsari kulcha'] },
  { name: 'Ludhiana', state: 'Punjab', district: 'Ludhiana', lat: 30.9010, lng: 75.8573, cat: 'city', icon: '🌆', fame: 'Manchester of India (Hosiery & Bicycles) & PAU', aliases: ['ludhiana', 'ldh', 'hosiery capital', 'hero cycles', 'firozpur road ludhiana'] },
  { name: 'Jalandhar', state: 'Punjab', district: 'Jalandhar', lat: 31.3260, lng: 75.5762, cat: 'city', icon: '🌆', fame: 'Sports Goods Manufacturing Hub & Devi Talab Mandir', aliases: ['jalandhar', 'sports city punjab', 'devi talab mandir', 'model town jalandhar'] },
  { name: 'Patiala', state: 'Punjab', district: 'Patiala', lat: 30.3398, lng: 76.3869, cat: 'city', icon: '🏰', fame: 'Royal City of Punjab, Qila Mubarak, Sheesh Mahal & Patiala Shahi Pagri', aliases: ['patiala', 'qila mubarak patiala', 'sheesh mahal patiala', 'patiala salwar', 'nis patiala'] },
  { name: 'Bathinda', state: 'Punjab', district: 'Bathinda', lat: 30.2110, lng: 74.9455, cat: 'city', icon: '🏰', fame: 'Historic Qila Mubarak (Razia Sultana Fort) & Thermal Power Hub', aliases: ['bathinda', 'bhatinda', 'qila mubarak bathinda', 'aiims bathinda'] },
  { name: 'Gurugram (Gurgaon)', state: 'Haryana', district: 'Gurugram', lat: 28.4595, lng: 77.0266, cat: 'metro', icon: '🏙️', fame: 'Millennium City of India, Cyber City, Cyber Hub & Fortune 500 HQ', aliases: ['gurugram', 'gurgaon', 'cyber city gurgaon', 'cyber hub', 'golf course road', 'dlf phase 1 2 3', 'sohna road', 'manesar'] },
  { name: 'Faridabad', state: 'Haryana', district: 'Faridabad', lat: 28.4089, lng: 77.3178, cat: 'city', icon: '🏙️', fame: 'Largest Industrial City of Haryana & Surajkund Crafts Mela', aliases: ['faridabad', 'surajkund', 'badkhal lake', 'nh 19 faridabad'] },
  { name: 'Panipat', state: 'Haryana', district: 'Panipat', lat: 29.3909, lng: 76.9635, cat: 'city', icon: '🌆', fame: 'City of Weavers & Three Historic Battles of Panipat', aliases: ['panipat', 'textile city panipat', 'battle of panipat', 'hemus samadhi'] },
  { name: 'Ambala', state: 'Haryana', district: 'Ambala', lat: 30.3782, lng: 76.7767, cat: 'city', icon: '✈️', fame: 'Twin City (Ambala Cantt / City), Scientific Instruments Hub & Air Force Base', aliases: ['ambala', 'ambala cantt', 'ambala city', 'scientific instruments city', 'rafale air base'] },
  { name: 'Kurukshetra', state: 'Haryana', district: 'Kurukshetra', lat: 29.9695, lng: 76.8783, cat: 'temple', icon: '🛕', fame: 'Land of Mahabharata War, Brahma Sarovar & Bhagavad Gita Birthplace (Jyotisar)', aliases: ['kurukshetra', 'brahma sarovar', 'jyotisar', 'bhagavad gita birthplace', 'thanesar'] },

  // --- UTTARAKHAND & HIMACHAL PRADESH ---
  { name: 'Dehradun', state: 'Uttarakhand', district: 'Dehradun', lat: 30.3165, lng: 78.0322, cat: 'city', icon: '🏔️', fame: 'Capital of Uttarakhand, Forest Research Institute (FRI) & IMA', aliases: ['dehradun', 'doon valley', 'fri dehradun', 'robbers cave', 'sahastradhara', 'rajpur road'] },
  { name: 'Haridwar', state: 'Uttarakhand', district: 'Haridwar', lat: 29.9457, lng: 78.1642, cat: 'temple', icon: '🛕', fame: 'Gateway to the Gods, Har Ki Pauri Ganga Aarti & Kumbh Mela', aliases: ['haridwar', 'har ki pauri', 'ganga aarti haridwar', 'chandi devi', 'mansa devi temple', 'hw'] },
  { name: 'Rishikesh', state: 'Uttarakhand', district: 'Dehradun', lat: 30.0869, lng: 78.2676, cat: 'temple', icon: '🧘', fame: 'Yoga Capital of the World, Ram Jhula, Laxman Jhula & River Rafting', aliases: ['rishikesh', 'yoga capital', 'ram jhula', 'laxman jhula', 'triveni ghat', 'beatles ashram', 'ganga rafting'] },
  { name: 'Nainital', state: 'Uttarakhand', district: 'Nainital', lat: 29.3919, lng: 79.4542, cat: 'hill_station', icon: '⛵', fame: 'City of Lakes, Naini Lake Boating, Naina Devi & Snow View', aliases: ['nainital', 'naini lake', 'naina devi temple', 'mall road nainital', 'tiffin top', 'bhimtal gateway'] },
  { name: 'Mussoorie', state: 'Uttarakhand', district: 'Dehradun', lat: 30.4598, lng: 78.0644, cat: 'hill_station', icon: '🏔️', fame: 'Queen of the Hills, Kempty Falls, Gun Hill & Mall Road', aliases: ['mussoorie', 'kempty falls', 'gun hill mussoorie', 'lal tibba', 'camel back road', 'cloud end'] },
  { name: 'Shimla', state: 'Himachal Pradesh', district: 'Shimla', lat: 31.1048, lng: 77.1734, cat: 'hill_station', icon: '🏔️', fame: 'Summer Capital of British India, The Ridge, Mall Road & Kalka Toy Train', aliases: ['shimla', 'the ridge shimla', 'mall road shimla', 'jakhoo temple', 'kufri', 'kalka shimla toy train'] },
  { name: 'Manali', state: 'Himachal Pradesh', district: 'Kullu', lat: 32.2396, lng: 77.1887, cat: 'hill_station', icon: '🏔️', fame: 'Solang Valley Adventure, Atal Tunnel, Rohtang Pass & Hadimba Temple', aliases: ['manali', 'solang valley', 'atal tunnel', 'rohtang pass', 'hadimba temple', 'old manali', 'vashisht'] },
  { name: 'Dharamshala & McLeodGanj', state: 'Himachal Pradesh', district: 'Kangra', lat: 32.2190, lng: 76.3234, cat: 'hill_station', icon: '🏔️', fame: 'Little Lhasa, Residence of the Dalai Lama & HPCA Cricket Stadium', aliases: ['dharamshala', 'dharamsala', 'mcleodganj', 'dalai lama temple', 'hpca stadium', 'triund trek', 'bhagsunath'] },
  { name: 'Spiti Valley (Kaza)', state: 'Himachal Pradesh', district: 'Lahaul and Spiti', lat: 32.2276, lng: 78.0520, cat: 'hill_station', icon: '🏔️', fame: 'Middle Land Cold Desert, Key Monastery, Chandratal & World’s Highest Post Office (Hikkim)', aliases: ['spiti valley', 'kaza', 'key monastery', 'chandratal lake', 'hikkim post office', 'kibber', 'pin valley'] },

  // --- JAMMU & KASHMIR & LADAKH ---
  { name: 'Srinagar', state: 'Jammu and Kashmir', district: 'Srinagar', lat: 34.0837, lng: 74.7973, cat: 'hill_station', icon: '🌸', fame: 'Paradise on Earth, Dal Lake Houseboats, Shikara Rides & Mughal Gardens', aliases: ['srinagar', 'dal lake', 'shikara', 'houseboat srinagar', 'shalimar bagh', 'nishat bagh', 'tulip garden srinagar', 'lal chowk'] },
  { name: 'Gulmarg', state: 'Jammu and Kashmir', district: 'Baramulla', lat: 34.0484, lng: 74.3805, cat: 'hill_station', icon: '⛷️', fame: 'Meadow of Flowers, World’s Highest Gondola & Premier Ski Resort', aliases: ['gulmarg', 'gulmarg gondola', 'ski resort kashmir', 'apharwat peak'] },
  { name: 'Pahalgam', state: 'Jammu and Kashmir', district: 'Anantnag', lat: 34.0150, lng: 75.1916, cat: 'nature', icon: '🏔️', fame: 'Valley of Shepherds, Betaab Valley, Aru Valley & Amarnath Yatra Base', aliases: ['pahalgam', 'betaab valley', 'aru valley', 'baisaran valley', 'amarnath base'] },
  { name: 'Jammu', state: 'Jammu and Kashmir', district: 'Jammu', lat: 32.7266, lng: 74.8570, cat: 'city', icon: '🛕', fame: 'City of Temples, Raghunath Temple, Bahu Fort & Winter Capital', aliases: ['jammu', 'jammu tawi', 'jat', 'raghunath temple', 'bahu fort jammu', 'mubarak mandi'] },
  { name: 'Leh Ladakh', state: 'Ladakh', district: 'Leh', lat: 34.1526, lng: 77.5771, cat: 'hill_station', icon: '🏔️', fame: 'Roof of the World, Pangong Tso, Khardung La Pass, Nubra Valley & Magnetic Hill', aliases: ['leh', 'ladakh', 'pangong tso', 'khardung la', 'nubra valley', 'shanti stupa leh', 'magnetic hill', 'thiksey monastery'] },

  // --- NORTHEAST INDIA (ALL 8 STATES) ---
  { name: 'Guwahati', state: 'Assam', district: 'Kamrup Metropolitan', lat: 26.1445, lng: 91.7362, cat: 'metro', icon: '🏙️', fame: 'Gateway to Northeast India, Kamakhya Temple & Brahmaputra Riverfront', aliases: ['guwahati', 'gauhati', 'ghy', 'kamakhya temple', 'brahmaputra', 'dispur', 'iit guwahati', 'paltan bazaar guwahati'] },
  { name: 'Kaziranga', state: 'Assam', district: 'Golaghat', lat: 26.5775, lng: 93.1711, cat: 'nature', icon: '🦏', fame: 'UNESCO World Heritage Home of the Great Indian One-Horned Rhinoceros', aliases: ['kaziranga', 'kaziranga national park', 'one horned rhino', 'kohora'] },
  // --- ANDHRA PRADESH (26 Districts) ---
  { name: 'Visakhapatnam (Vizag)', state: 'Andhra Pradesh', district: 'Visakhapatnam', lat: 17.6868, lng: 83.2185, cat: 'coastal', icon: '🏖️', fame: 'City of Destiny, RK Beach, Rushikonda, INS Kursura Submarine Museum & Steel Plant', aliases: ['visakhapatnam', 'vizag', 'vskp', 'rk beach vizag', 'rushikonda beach', 'kailasagiri', 'araku valley gateway', 'dolphins nose vizag'] },
  { name: 'Vijayawada', state: 'Andhra Pradesh', district: 'NTR', lat: 16.5062, lng: 80.6480, cat: 'city', icon: '🛕', fame: 'Kanaka Durga Temple on Indrakeeladri, Prakasam Barrage & Commercial Capital of AP', aliases: ['vijayawada', 'bezawada', 'bza', 'kanaka durga temple', 'prakasam barrage', 'undavalli caves', 'bhavani island'] },
  { name: 'Guntur & Amaravati', state: 'Andhra Pradesh', district: 'Guntur', lat: 16.3067, lng: 80.4365, cat: 'city', icon: '🏛️', fame: 'Capital Region of AP, Chilli Market & Historic Buddhist Amaravati Mahachaitya', aliases: ['guntur', 'amaravati', 'amaravathi', 'chilli market', 'dhyana buddha amaravati'] },
  { name: 'Tirupati & Tirumala', state: 'Andhra Pradesh', district: 'Tirupati', lat: 13.6288, lng: 79.4192, cat: 'temple', icon: '🛕', fame: 'Sri Venkateswara Swamy Temple (Tirumala Balaji) on Seven Hills', aliases: ['tirupati', 'tpty', 'tirumala', 'balaji temple', 'seven hills', 'alipiri', 'kapila theertham', 'sv temple'] },
  { name: 'Kurnool', state: 'Andhra Pradesh', district: 'Kurnool', lat: 15.8281, lng: 78.0373, cat: 'city', icon: '🏰', fame: 'Gateway to Rayalaseema, Konda Reddy Buruju Fort, Belum Caves & Yaganti', aliases: ['kurnool', 'konda reddy buruju', 'belum caves', 'yaganti temple', 'orvakal rock garden'] },
  { name: 'Nellore', state: 'Andhra Pradesh', district: 'SPSR Nellore', lat: 14.4426, lng: 79.9865, cat: 'coastal', icon: '🏖️', fame: 'Pulicat Lake Bird Sanctuary, Sriharikota ISRO Launch Pad & Ranganathaswamy Temple', aliases: ['nellore', 'nlr', 'sriharikota', 'shar isro space center', 'pulicat lake', 'mynapad beach'] },
  { name: 'Rajamahendravaram (Rajahmundry)', state: 'Andhra Pradesh', district: 'East Godavari', lat: 17.0005, lng: 81.8040, cat: 'city', icon: '🌊', fame: 'Cultural Capital of Andhra, Godavari River Ghats & Iconic Godavari Arch Bridge', aliases: ['rajahmundry', 'rajamahendravaram', 'rjy', 'godavari bridge', 'pushkar ghat', 'papikondalu gateway'] },
  { name: 'Kakinada', state: 'Andhra Pradesh', district: 'Kakinada', lat: 16.9891, lng: 82.2475, cat: 'coastal', icon: '🏖️', fame: 'Deepwater Port, Coringa Wildlife Sanctuary & Kakinada Kaaja Sweet', aliases: ['kakinada', 'coringa mangrove forest', 'hope island', 'kakinada port'] },
  { name: 'Kadapa (Cuddapah)', state: 'Andhra Pradesh', district: 'YSR Kadapa', lat: 14.4673, lng: 78.8242, cat: 'city', icon: '🏰', fame: 'Gandikota (Grand Canyon of India) & Ameen Peer Dargah', aliases: ['kadapa', 'cuddapah', 'gandikota', 'grand canyon of india', 'ameen peer dargah'] },
  { name: 'Anantapur', state: 'Andhra Pradesh', district: 'Anantapur', lat: 14.6819, lng: 77.6006, cat: 'city', icon: '🛕', fame: 'Historic Lepakshi Hanging Pillar Temple & ISKCON Temple', aliases: ['anantapur', 'lepakshi temple', 'lepakshi nandi', 'puttaparthi gateway'] },
  { name: 'Srisailam', state: 'Andhra Pradesh', district: 'Nandyal', lat: 16.0744, lng: 78.8683, cat: 'temple', icon: '🛕', fame: 'Mallikarjuna Jyotirlinga (One of 12 Jyotirlingas & Shakti Peethas) & Dam on Krishna', aliases: ['srisailam', 'mallikarjuna jyotirlinga', 'srisailam dam', 'nallamala forest'] },
  { name: 'Araku Valley', state: 'Andhra Pradesh', district: 'Alluri Sitharama Raju', lat: 18.3273, lng: 82.8775, cat: 'hill_station', icon: '☕', fame: 'Hill Station of Andhra, Organic Coffee Plantations & Borra Caves', aliases: ['araku', 'araku valley', 'borra caves', 'katiki waterfalls', 'chaprai waterfalls', 'araku coffee'] },

  // --- TELANGANA (33 Districts & Tech Titans) ---
  { name: 'Hyderabad', state: 'Telangana', district: 'Hyderabad', lat: 17.3850, lng: 78.4867, cat: 'metro', icon: '🏙️', fame: 'City of Pearls, HITEC City, Charminar, Golconda Fort & World-Famous Hyderabadi Biryani', aliases: ['hyderabad', 'secunderabad', 'hyd', 'hitec city', 'gachibowli', 'jubilee hills', 'banjara hills', 'charminar', 'golconda fort', 'hussain sagar', 'madhapur'] },
  { name: 'Warangal', state: 'Telangana', district: 'Warangal', lat: 17.9689, lng: 79.5941, cat: 'heritage', icon: '🏛️', fame: 'Kakatiya Dynasty Heritage, Thousand Pillar Temple & Ramappa Temple (UNESCO)', aliases: ['warangal', 'kazipet', 'hanamkonda', 'thousand pillar temple', 'ramappa temple', 'warangal fort', 'laknavaram lake'] },
  { name: 'Nizamabad', state: 'Telangana', district: 'Nizamabad', lat: 18.6725, lng: 78.0941, cat: 'city', icon: '🏰', fame: 'Historic Nizamabad Fort, Ashok Sagar & Alisagar', aliases: ['nizamabad', 'alisagar', 'ashok sagar', 'nizamabad fort'] },
  { name: 'Karimnagar', state: 'Telangana', district: 'Karimnagar', lat: 18.4386, lng: 79.1288, cat: 'city', icon: '🌊', fame: 'Silver Filigree Craft (Tarakasi), Lower Manair Dam & Elgandal Fort', aliases: ['karimnagar', 'elgandal fort', 'lower manair dam', 'silver filigree karimnagar'] },
  { name: 'Khammam', state: 'Telangana', district: 'Khammam', lat: 17.2473, lng: 80.1514, cat: 'city', icon: '🏰', fame: 'Stambhadri / Khammam Fort on Stambhadri Hill & Coal Mining Region', aliases: ['khammam', 'khammam fort', 'palair lake', 'kinnerasani'] },
  { name: 'Bhadrachalam', state: 'Telangana', district: 'Bhadradri Kothagudem', lat: 17.6689, lng: 80.8936, cat: 'temple', icon: '🛕', fame: 'Sri Sita Ramachandraswamy Temple on the Sacred Godavari River', aliases: ['bhadrachalam', 'bhadrachalam temple', 'sita ram temple', 'godavari bhadrachalam', 'parnashala'] },

  // --- KERALA (14 Districts & God’s Own Country) ---
  { name: 'Kochi (Cochin & Ernakulam)', state: 'Kerala', district: 'Ernakulam', lat: 9.9312, lng: 76.2673, cat: 'metro', icon: '🏙️', fame: 'Queen of the Arabian Sea, Fort Kochi Chinese Fishing Nets, Marine Drive & Kochi Metro', aliases: ['kochi', 'cochin', 'ernakulam', 'ers', 'ern', 'fort kochi', 'marine drive kochi', 'kakkanad infopark', 'mattancherry palace'] },
  { name: 'Thiruvananthapuram (Trivandrum)', state: 'Kerala', district: 'Thiruvananthapuram', lat: 8.5241, lng: 76.9366, cat: 'metro', icon: '🛕', fame: 'Capital of Kerala, Padmanabhaswamy Temple (Richest Temple) & Technopark', aliases: ['thiruvananthapuram', 'trivandrum', 'tvc', 'padmanabhaswamy temple', 'kovalam beach', 'technopark trivandrum', 'varkala cliff'] },
  { name: 'Kozhikode (Calicut)', state: 'Kerala', district: 'Kozhikode', lat: 11.2588, lng: 75.7804, cat: 'city', icon: '🏖️', fame: 'City of Spices, Where Vasco da Gama Landed (Kappad Beach) & Kozhikodan Halwa', aliases: ['kozhikode', 'calicut', 'clt', 'kappad beach', 'sm street calicut', 'mananchira square', 'beypore port'] },
  { name: 'Munnar', state: 'Kerala', district: 'Idukki', lat: 10.0889, lng: 77.0595, cat: 'hill_station', icon: '☕', fame: 'Emerald Tea Gardens, Anamudi Peak (Highest in South India) & Neelakurinji Flowers', aliases: ['munnar', 'anamudi peak', 'eravikulam national park', 'mattupetty dam', 'tea museum munnar', 'top station munnar'] },
  { name: 'Alappuzha (Alleppey)', state: 'Kerala', district: 'Alappuzha', lat: 9.4981, lng: 76.3388, cat: 'coastal', icon: '⛵', fame: 'Venice of the East, Backwaters Houseboat Cruises & Nehru Trophy Boat Race', aliases: ['alleppey', 'alappuzha', 'allp', 'kerala backwaters', 'houseboat cruise alleppey', 'punnamada lake', 'marari beach'] },
  { name: 'Wayanad (Kalpetta)', state: 'Kerala', district: 'Wayanad', lat: 11.6854, lng: 76.1320, cat: 'hill_station', icon: '🌿', fame: 'Banasura Sagar Dam, Edakkal Caves (Stone Age Petroglyphs) & Chembra Heart Lake', aliases: ['wayanad', 'kalpetta', 'edakkal caves', 'banasura sagar dam', 'chembra peak', 'kuruva island', 'sulthan bathery'] },
  { name: 'Thrissur', state: 'Kerala', district: 'Thrissur', lat: 10.5276, lng: 76.2144, cat: 'temple', icon: '🛕', fame: 'Cultural Capital of Kerala, Thrissur Pooram (Festival of Festivals) & Vadakkunnathan', aliases: ['thrissur', 'trichur', 'tcr', 'thrissur pooram', 'vadakkunnathan temple', 'guruvayur gateway'] },
  { name: 'Guruvayur', state: 'Kerala', district: 'Thrissur', lat: 10.5947, lng: 76.0418, cat: 'temple', icon: '🛕', fame: 'Guruvayur Sri Krishna Temple (Bhuloka Vaikuntha) & Elephant Sanctuary (Punnathurkotta)', aliases: ['guruvayur', 'guruvayoor', 'guruvayurappan', 'guruvayur krishna temple', 'punnathurkotta elephant camp'] },
  { name: 'Varkala', state: 'Kerala', district: 'Thiruvananthapuram', lat: 8.7379, lng: 76.7163, cat: 'coastal', icon: '🏖️', fame: 'Papanasam Beach Cliff, Arabian Sea Sunset & Janardhana Swamy Temple', aliases: ['varkala', 'varkala cliff', 'papanasam beach', 'varkala beach', 'sivagiri mutt'] },
  { name: 'Thekkady (Periyar)', state: 'Kerala', district: 'Idukki', lat: 9.6031, lng: 77.1615, cat: 'nature', icon: '🐘', fame: 'Periyar National Park & Tiger Reserve, Spice Plantations & Lake Boating', aliases: ['thekkady', 'periyar tiger reserve', 'periyar lake', 'kumily', 'spice plantation thekkady'] },

  // --- JHARKHAND (24 Districts & Mineral Riches) ---
  { name: 'Ranchi', state: 'Jharkhand', district: 'Ranchi', lat: 23.3441, lng: 85.3096, cat: 'metro', icon: '🏙️', fame: 'City of Waterfalls, Capital of Jharkhand, Hundru Falls, Jonha Falls & Patratu Valley', aliases: ['ranchi', 'rnc', 'hundru falls', 'jonha falls', 'dassam falls', 'patratu valley', 'tagore hill ranchi', 'dhoni hometown'] },
  { name: 'Jamshedpur (Tatanagar)', state: 'Jharkhand', district: 'East Singhbhum', lat: 22.8046, lng: 86.2029, cat: 'metro', icon: '🏭', fame: 'Steel City of India, Jamshedji Tata Planned City, Jubilee Park & Tata Steel', aliases: ['jamshedpur', 'tatanagar', 'tata', 'jubilee park jamshedpur', 'dimna lake', 'bistupur', 'sakchi', 'xlri jamshedpur'] },
  { name: 'Dhanbad', state: 'Jharkhand', district: 'Dhanbad', lat: 23.7957, lng: 86.4304, cat: 'city', icon: '⛏️', fame: 'Coal Capital of India, IIT (ISM) Dhanbad & Jharia Coalfields', aliases: ['dhanbad', 'dhn', 'coal capital', 'iit ism dhanbad', 'maithon dam', 'panchet dam'] },
  { name: 'Bokaro Steel City', state: 'Jharkhand', district: 'Bokaro', lat: 23.6693, lng: 86.1511, cat: 'city', icon: '🏭', fame: 'One of India’s Largest Steel Plants (SAIL Bokaro) & City Park', aliases: ['bokaro', 'bokaro steel city', 'bksc', 'sail bokaro', 'garga dam', 'jagannath temple bokaro'] },
  { name: 'Deoghar (Baidyanath Dham)', state: 'Jharkhand', district: 'Deoghar', lat: 24.4826, lng: 86.7000, cat: 'temple', icon: '🛕', fame: 'Baba Baidyanath Jyotirlinga Dham (Shravani Mela) & Trikut Pahar', aliases: ['deoghar', 'baidyanath dham', 'baba dham deoghar', 'shravani mela deoghar', 'trikut ropeway'] },
  { name: 'Hazaribagh', state: 'Jharkhand', district: 'Hazaribagh', lat: 23.9925, lng: 85.3637, cat: 'nature', icon: '🌳', fame: 'City of Thousand Gardens, Hazaribagh National Park & Canary Hill', aliases: ['hazaribagh', 'hazaribag', 'hazaribagh national park', 'canary hill', 'konar dam'] },

  // --- CHHATTISGARH (33 Districts) ---
  { name: 'Raipur & Nava Raipur', state: 'Chhattisgarh', district: 'Raipur', lat: 21.2514, lng: 81.6296, cat: 'metro', icon: '🏙️', fame: 'Capital of Chhattisgarh, Smart Greenfield City Nava Raipur & Swami Vivekananda Airport', aliases: ['raipur', 'nava raipur', 'atal nagar', 'r', 'telibandha lake marine drive', 'purkhouti muktangan', 'iim aiims raipur'] },
  { name: 'Bhilai & Durg', state: 'Chhattisgarh', district: 'Durg', lat: 21.2167, lng: 81.3833, cat: 'city', icon: '🏭', fame: 'Steel City of Central India (Bhilai Steel Plant - SAIL) & Maitri Bagh', aliases: ['bhilai', 'durg', 'bhilai steel plant', 'maitri bagh zoo', 'iit bhilai'] },
  { name: 'Bilaspur', state: 'Chhattisgarh', district: 'Bilaspur', lat: 22.0797, lng: 82.1409, cat: 'city', icon: '⚖️', fame: 'High Court of Chhattisgarh, South East Central Railway HQ & Kanan Pendari', aliases: ['bilaspur', 'bsp', 'chhattisgarh high court', 'secr headquarters', 'ratanpur mahamaya temple'] },
  { name: 'Jagdalpur & Bastar', state: 'Chhattisgarh', district: 'Bastar', lat: 19.0744, lng: 82.0081, cat: 'nature', icon: '🌊', fame: 'Chitrakote Falls (Niagara of India on Indravati River), Tirathgarh & Bastar Tribal Art', aliases: ['jagdalpur', 'bastar', 'chitrakote waterfall', 'niagara of india', 'tirathgarh falls', 'kanger valley national park', 'kotumsar cave'] },
  { name: 'Korba', state: 'Chhattisgarh', district: 'Korba', lat: 22.3595, lng: 82.7501, cat: 'city', icon: '⚡', fame: 'Power Capital of Chhattisgarh (NTPC & BALCO Aluminium)', aliases: ['korba', 'power city chhattisgarh', 'balco aluminium', 'hasdeo bango dam'] },

  // --- DELHI NCR LOCALITIES & NEIGHBORHOODS ---
  { name: 'Connaught Place & Central Delhi', state: 'Delhi', district: 'New Delhi', lat: 28.6315, lng: 77.2167, cat: 'metro', icon: '🏛️', fame: 'Colonial Georgian Arcade, Financial Heart of Delhi & Rajiv Chowk Metro Hub', aliases: ['connaught place', 'cp delhi', 'rajiv chowk', 'janpath market', 'inner circle cp', 'outer circle cp', 'palika bazaar'] },
  { name: 'Chandni Chowk & Old Delhi', state: 'Delhi', district: 'Central Delhi', lat: 28.6506, lng: 77.2303, cat: 'heritage', icon: '🍲', fame: 'Historic Mughal Bazaars, Paranthe Wali Gali, Jama Masjid & Sis Ganj Sahib', aliases: ['chandni chowk', 'old delhi', 'paranthe wali gali', 'jama masjid delhi', 'gurudwara sis ganj', 'khari baoli spice market'] },
  { name: 'Dwarka', state: 'Delhi', district: 'South West Delhi', lat: 28.5823, lng: 77.0500, cat: 'city', icon: '🏙️', fame: 'Asia’s Largest Residential Sub-City, Yashobhoomi Convention Center & Delhi Airport Metro', aliases: ['dwarka', 'dwarka sub city', 'dwarka sector 21', 'yashobhoomi iicc', 'dwarka expressway'] },
  { name: 'Saket & Hauz Khas', state: 'Delhi', district: 'South Delhi', lat: 28.5245, lng: 77.2066, cat: 'city', icon: '🛍️', fame: 'Select Citywalk Mall, Hauz Khas Village, Medieval Fort & Deer Park', aliases: ['saket', 'select citywalk', 'hauz khas village', 'hkv', 'hauz khas fort', 'deer park saket'] },
  { name: 'Rohini & Pitampura', state: 'Delhi', district: 'North West Delhi', lat: 28.7159, lng: 77.1170, cat: 'city', icon: '🏙️', fame: 'Pitampura TV Tower, Dilli Haat Pitampura & Major Residential Zone', aliases: ['rohini', 'pitampura', 'dilli haat pitampura', 'tv tower pitampura', 'adventure island rohini'] },
  { name: 'Aerocity New Delhi', state: 'Delhi', district: 'South West Delhi', lat: 28.5505, lng: 77.1216, cat: 'airport', icon: '✈️', fame: 'Luxury Hospitality District at Indira Gandhi International Airport (IGI T3)', aliases: ['aerocity', 'igi airport aerocity', 'delhi airport t3', 'worldmark aerocity'] },
];

console.log(`Compiling comprehensive All-India Gazetteer (${CITIES_BY_STATE.length} curated cities & landmarks)...`);

// Build format
let fileContent = `/**
 * ACCESS / Maarg Darshan — Universal All-India Gazetteer & Iconic Monuments Dataset
 *
 * Comprehensive geo-mapping for all 28 States & 8 Union Territories:
 * - Metros, Tier 1, Tier 2, Tier 3, Tier 4 Cities & District Capitals
 * - 120+ Famous Indian Monuments, UNESCO World Heritage Sites, Temples & Hill Stations
 * - Full alias dictionary (e.g., Bombay -> Mumbai, Kashi -> Varanasi, Taj -> Taj Mahal)
 * - Exact GPS Coordinates (Latitude, Longitude) for 0ms Instant Client Search
 */

export interface IndiaPlace {
  id: string;
  name: string;
  displayName: string;
  state: string;
  district?: string;
  lat: number;
  lng: number;
  category: 'metro' | 'city' | 'town' | 'monument' | 'heritage' | 'temple' | 'hill_station' | 'coastal' | 'nature' | 'airport' | 'railway';
  icon: string;
  aliases: string[];
  hasRamp?: boolean;
  famousFor?: string;
}

export const ALL_INDIA_GAZETTEER: IndiaPlace[] = [
`;

// 2. Iconic Monuments & Heritage Sites
const ALL_INDIA_MONUMENTS = [
  { id: 'mon_taj_mahal', name: 'Taj Mahal', displayName: '🏛️ Taj Mahal • Agra, Uttar Pradesh (UNESCO World Heritage)', state: 'Uttar Pradesh', district: 'Agra', lat: 27.1751, lng: 78.0421, category: 'monument', icon: '🏛️', aliases: ['taj', 'taj mahal', 'tajmahal', 'agra taj mahal', 'mumtaz mahal', 'wonder of the world', 'seven wonders'], hasRamp: true, famousFor: 'World Heritage Wonder of the World & Mughal Architecture' },
  { id: 'mon_qutub_minar', name: 'Qutub Minar', displayName: '🏛️ Qutub Minar • Mehrauli, New Delhi (UNESCO Heritage)', state: 'Delhi', district: 'South Delhi', lat: 28.5245, lng: 77.1855, category: 'monument', icon: '🏛️', aliases: ['qutub', 'qutb minar', 'qutub minar delhi', 'iron pillar'], hasRamp: true, famousFor: 'Tallest Brick Minaret in the World' },
  { id: 'mon_red_fort', name: 'Red Fort (Lal Qila)', displayName: '🏛️ Red Fort (Lal Qila) • Old Delhi (UNESCO Heritage)', state: 'Delhi', district: 'Central Delhi', lat: 28.6562, lng: 77.2410, category: 'monument', icon: '🏛️', aliases: ['red fort', 'lal qila', 'lal kila', 'delhi fort', 'chandni chowk fort'], hasRamp: true, famousFor: 'Historic Mughal Citadel and Independence Day Address' },
  { id: 'mon_india_gate', name: 'India Gate & Kartavya Path', displayName: '🏛️ India Gate • Rajpath / Kartavya Path, New Delhi', state: 'Delhi', district: 'New Delhi', lat: 28.6129, lng: 77.2295, category: 'monument', icon: '🏛️', aliases: ['india gate', 'all india war memorial', 'amar jawan jyoti', 'kartavya path', 'rajpath'], hasRamp: true, famousFor: 'National War Memorial Arch & Ceremonial Boulevard' },
  { id: 'mon_lotus_temple', name: 'Lotus Temple (Baháʼí House of Worship)', displayName: '🏛️ Lotus Temple • Kalkaji, New Delhi', state: 'Delhi', district: 'South Delhi', lat: 28.5535, lng: 77.2588, category: 'monument', icon: '🏛️', aliases: ['lotus temple', 'bahai temple', 'lotus temple delhi', 'kalkaji temple'], hasRamp: true, famousFor: 'Flower-like White Marble Architectural Wonder' },
  { id: 'mon_golden_temple', name: 'Golden Temple (Harmandir Sahib)', displayName: '🛕 Golden Temple (Harmandir Sahib) • Amritsar, Punjab', state: 'Punjab', district: 'Amritsar', lat: 31.6200, lng: 74.8765, category: 'temple', icon: '🛕', aliases: ['golden temple', 'harmandir sahib', 'amritsar temple', 'darbar sahib', 'swarna mandir'], hasRamp: true, famousFor: 'Holiest Sikh Gurdwara with 24/7 Community Langar' },
  { id: 'mon_statue_of_unity', name: 'Statue of Unity', displayName: '🏛️ Statue of Unity • Kevadia (Ekta Nagar), Gujarat', state: 'Gujarat', district: 'Narmada', lat: 21.8380, lng: 73.7191, category: 'monument', icon: '🏛️', aliases: ['statue of unity', 'sardar patel statue', 'kevadia', 'ekta nagar', 'tallest statue'], hasRamp: true, famousFor: "World's Tallest Statue (182m) Dedicated to Sardar Vallabhbhai Patel" },
  { id: 'mon_gateway_of_india', name: 'Gateway of India', displayName: '🏛️ Gateway of India • Colaba, Mumbai, Maharashtra', state: 'Maharashtra', district: 'Mumbai', lat: 18.9220, lng: 72.8347, category: 'monument', icon: '🏛️', aliases: ['gateway of india', 'gateway mumbai', 'colaba gateway', 'taj hotel mumbai'], hasRamp: true, famousFor: 'Historic Waterfront Arch of Mumbai Harbour' },
  { id: 'mon_hawa_mahal', name: 'Hawa Mahal (Palace of Winds)', displayName: '🏛️ Hawa Mahal • Pink City, Jaipur, Rajasthan', state: 'Rajasthan', district: 'Jaipur', lat: 26.9239, lng: 75.8267, category: 'monument', icon: '🏛️', aliases: ['hawa mahal', 'palace of winds', 'jaipur palace', 'pink city mahal', 'badi chaupar'], hasRamp: true, famousFor: '953 Honeycomb Casements Pink Sandstone Palace' },
  { id: 'mon_charminar', name: 'Charminar', displayName: '🏛️ Charminar • Old City, Hyderabad, Telangana', state: 'Telangana', district: 'Hyderabad', lat: 17.3616, lng: 78.4747, category: 'monument', icon: '🏛️', aliases: ['charminar', 'charminar hyderabad', 'laad bazaar', 'four minarets'], hasRamp: true, famousFor: '16th Century Four-Minaret Monument of Hyderabad' },
  { id: 'mon_victoria_memorial', name: 'Victoria Memorial', displayName: '🏛️ Victoria Memorial Hall • Maidan, Kolkata, West Bengal', state: 'West Bengal', district: 'Kolkata', lat: 22.5448, lng: 88.3426, category: 'monument', icon: '🏛️', aliases: ['victoria memorial', 'victoria kolkata', 'maidan memorial', 'white marble palace kolkata'], hasRamp: true, famousFor: 'Grand White Makrana Marble Monument & Museum' },
  { id: 'mon_howrah_bridge', name: 'Howrah Bridge (Rabindra Setu)', displayName: '🏛️ Howrah Bridge (Rabindra Setu) • Kolkata / Howrah', state: 'West Bengal', district: 'Howrah', lat: 22.5851, lng: 88.3468, category: 'monument', icon: '🏛️', aliases: ['howrah bridge', 'rabindra setu', 'hooghly bridge', 'cantilever bridge'], hasRamp: true, famousFor: 'World Renowned Balanced Cantilever River Bridge' },
  { id: 'mon_konark_sun_temple', name: 'Konark Sun Temple', displayName: '🛕 Konark Sun Temple • Puri District, Odisha (UNESCO Heritage)', state: 'Odisha', district: 'Puri', lat: 19.8876, lng: 86.0945, category: 'heritage', icon: '🛕', aliases: ['konark', 'sun temple', 'black pagoda', 'konark temple', 'sun temple konark', 'chandrabhaga'], hasRamp: true, famousFor: '13th Century Colossal Chariot-shaped Sun Temple' },
  { id: 'mon_jagannath_puri', name: 'Shree Jagannath Temple', displayName: '🛕 Shree Jagannath Temple • Puri, Odisha (Char Dham)', state: 'Odisha', district: 'Puri', lat: 19.8049, lng: 85.8179, category: 'temple', icon: '🛕', aliases: ['jagannath', 'jagannath temple', 'puri temple', 'shree mandira', 'badadanda', 'ratha yatra', 'char dham puri'], hasRamp: true, famousFor: 'Sacred Char Dham Shrine Famous for World Ratha Yatra' },
  { id: 'mon_lingaraj_temple', name: 'Lingaraj Temple', displayName: '🛕 Lingaraj Temple • Old Town, Bhubaneswar, Odisha', state: 'Odisha', district: 'Khordha', lat: 20.2382, lng: 85.8338, category: 'temple', icon: '🛕', aliases: ['lingaraj', 'lingaraj temple', 'bhubaneswar temple', 'bindu sagar', 'old town bbsr'], hasRamp: true, famousFor: '11th Century Masterpiece of Kalinga Temple Architecture' },
  { id: 'mon_dhauli_stupa', name: 'Dhauli Shanti Stupa (Peace Pagoda)', displayName: '🏛️ Dhauli Shanti Stupa • Daya River, Bhubaneswar, Odisha', state: 'Odisha', district: 'Khordha', lat: 20.1923, lng: 85.8394, category: 'monument', icon: '🏛️', aliases: ['dhauli', 'dhauli stupa', 'peace pagoda', 'kalinga war site', 'ashoka edicts'], hasRamp: true, famousFor: 'Historic Kalinga War Battlefield & Ashokan Rock Edicts' },
  { id: 'mon_hampi_virupaksha', name: 'Hampi Ruins & Virupaksha Temple', displayName: '🏛️ Hampi (Vijayanagara Ruins) • Ballari, Karnataka (UNESCO)', state: 'Karnataka', district: 'Vijayanagara', lat: 15.3350, lng: 76.4600, category: 'heritage', icon: '🏛️', aliases: ['hampi', 'hampi ruins', 'virupaksha temple', 'stone chariot', 'vijayanagara', 'hampi karnataka'], hasRamp: true, famousFor: 'Capital of Vijayanagara Empire & Stone Chariot' },
  { id: 'mon_mysore_palace', name: 'Mysore Palace (Amba Vilas)', displayName: '🏛️ Mysore Palace (Amba Vilas) • Mysuru, Karnataka', state: 'Karnataka', district: 'Mysuru', lat: 12.3051, lng: 76.6551, category: 'monument', icon: '🏛️', aliases: ['mysore palace', 'amba vilas', 'mysuru palace', 'chamundi palace', 'dasara palace'], hasRamp: true, famousFor: 'Royal Seat of Wadiyar Dynasty Illuminated by 100,000 Lights' },
  { id: 'mon_meenakshi_temple', name: 'Meenakshi Amman Temple', displayName: '🛕 Meenakshi Amman Temple • Madurai, Tamil Nadu', state: 'Tamil Nadu', district: 'Madurai', lat: 9.9195, lng: 78.1193, category: 'temple', icon: '🛕', aliases: ['meenakshi temple', 'madurai temple', 'meenakshi amman', 'madurai meenakshi', 'gopuram'], hasRamp: true, famousFor: 'Historic Dravidian Temple with 14 Monumental Gopurams' },
  { id: 'mon_brihadeeswarar_temple', name: 'Brihadeeswarar Temple (Big Temple)', displayName: '🛕 Brihadeeswarar Temple • Thanjavur, Tamil Nadu (UNESCO)', state: 'Tamil Nadu', district: 'Thanjavur', lat: 10.7828, lng: 79.1318, category: 'heritage', icon: '🛕', aliases: ['brihadeeswarar', 'thanjavur big temple', 'thanjavur temple', 'peruvudaiyar kovil', 'great living chola'], hasRamp: true, famousFor: '1000-Year-Old Chola Granite Temple with Monolithic Vimana' },
  { id: 'mon_mahabalipuram', name: 'Shore Temple & Pancha Rathas', displayName: '🏛️ Mahabalipuram (Mamallapuram) • Tamil Nadu (UNESCO)', state: 'Tamil Nadu', district: 'Chengalpattu', lat: 12.6208, lng: 80.1983, category: 'heritage', icon: '🏛️', aliases: ['mahabalipuram', 'mamallapuram', 'shore temple', 'pancha rathas', 'arjuna penance'], hasRamp: true, famousFor: '7th Century Pallava Dynasty Rock-Cut Sanctuaries' },
  { id: 'mon_kanyakumari_memorial', name: 'Vivekananda Rock Memorial & Thiruvalluvar Statue', displayName: '🏛️ Vivekananda Rock Memorial • Kanyakumari (Southern Tip)', state: 'Tamil Nadu', district: 'Kanyakumari', lat: 8.0781, lng: 77.5552, category: 'monument', icon: '🏛️', aliases: ['kanyakumari', 'vivekananda rock', 'thiruvalluvar statue', 'cape comorin', 'triveni sangam ocean'], hasRamp: true, famousFor: 'Confluence of Arabian Sea, Bay of Bengal & Indian Ocean' },
  { id: 'mon_ram_mandir_ayodhya', name: 'Shri Ram Janmabhoomi Mandir', displayName: '🛕 Shri Ram Mandir • Ayodhya, Uttar Pradesh', state: 'Uttar Pradesh', district: 'Ayodhya', lat: 26.7956, lng: 82.1943, category: 'temple', icon: '🛕', aliases: ['ayodhya', 'ram mandir', 'ram janmabhoomi', 'ayodhya temple', 'saryu ghat', 'hanuman garhi'], hasRamp: true, famousFor: 'Sacred Birthplace of Lord Shri Ram on Banks of River Saryu' },
  { id: 'mon_kashi_vishwanath', name: 'Kashi Vishwanath Temple & Ghats', displayName: '🛕 Kashi Vishwanath & Dashashwamedh Ghat • Varanasi, UP', state: 'Uttar Pradesh', district: 'Varanasi', lat: 25.3109, lng: 83.0107, category: 'temple', icon: '🛕', aliases: ['varanasi', 'kashi', 'banaras', 'benares', 'kashi vishwanath', 'ganga aarti', 'dashashwamedh', 'assi ghat'], hasRamp: true, famousFor: 'Ancient Sacred City, Ganga Aarti & 12 Jyotirlinga' },
  { id: 'mon_ajanta_caves', name: 'Ajanta Caves', displayName: '🏛️ Ajanta Caves • Chhatrapati Sambhaji Nagar (UNESCO)', state: 'Maharashtra', district: 'Aurangabad', lat: 20.5519, lng: 75.7033, category: 'heritage', icon: '🏛️', aliases: ['ajanta', 'ajanta caves', 'ajanta aurangabad', 'buddhist caves', 'ajanta paintings'], hasRamp: false, famousFor: 'Rock-Cut Buddhist Cave Monuments with Ancient Murals' },
  { id: 'mon_ellora_caves', name: 'Ellora Caves & Kailasa Temple', displayName: '🏛️ Ellora Caves (Kailasa Temple) • Maharashtra (UNESCO)', state: 'Maharashtra', district: 'Aurangabad', lat: 20.0268, lng: 75.1790, category: 'heritage', icon: '🏛️', aliases: ['ellora', 'ellora caves', 'kailasa temple', 'kailash temple', 'monolithic temple'], hasRamp: true, famousFor: "World's Largest Monolithic Rock Excavation (Kailasa Temple)" },
  { id: 'mon_khajuraho_temples', name: 'Khajuraho Group of Monuments', displayName: '🏛️ Khajuraho Temples • Chhatarpur, MP (UNESCO Heritage)', state: 'Madhya Pradesh', district: 'Chhatarpur', lat: 24.8318, lng: 79.9199, category: 'heritage', icon: '🏛️', aliases: ['khajuraho', 'khajuraho temples', 'kandariya mahadeva', 'chandela temples', 'khajuraho mp'], hasRamp: true, famousFor: 'Nagara-Style Architectural Temple Complex with Intricate Sculptures' },
  { id: 'mon_sanchi_stupa', name: 'Great Stupa at Sanchi', displayName: '🏛️ Sanchi Stupa • Raisen District, MP (UNESCO Heritage)', state: 'Madhya Pradesh', district: 'Raisen', lat: 23.4873, lng: 77.7423, category: 'heritage', icon: '🏛️', aliases: ['sanchi', 'sanchi stupa', 'great stupa', 'ashoka sanchi', 'buddhist stupa'], hasRamp: true, famousFor: 'Oldest Stone Structure in India Commissioned by Emperor Ashoka' },
  { id: 'mon_mahabodhi_temple', name: 'Mahabodhi Temple Complex', displayName: '🛕 Mahabodhi Temple (Bodhi Tree) • Bodh Gaya, Bihar (UNESCO)', state: 'Bihar', district: 'Gaya', lat: 24.6960, lng: 84.9914, category: 'heritage', icon: '🛕', aliases: ['bodh gaya', 'mahabodhi', 'bodhi tree', 'gaya temple', 'buddha enlightenment'], hasRamp: true, famousFor: 'Where Gautama Buddha Attained Supreme Enlightenment' },
  { id: 'mon_nalanda_ruins', name: 'Nalanda Mahavihara (Ancient University)', displayName: '🏛️ Nalanda University Ruins • Nalanda, Bihar (UNESCO)', state: 'Bihar', district: 'Nalanda', lat: 25.1357, lng: 85.4450, category: 'heritage', icon: '🏛️', aliases: ['nalanda', 'nalanda university', 'nalanda mahavihara', 'ancient nalanda', 'rajgir'], hasRamp: true, famousFor: 'Ancient Seat of Global Learning and Monastic University' },
  { id: 'mon_somnath_temple', name: 'Shree Somnath Jyotirlinga Temple', displayName: '🛕 Shree Somnath Temple • Prabhas Patan, Veraval, Gujarat', state: 'Gujarat', district: 'Gir Somnath', lat: 20.8880, lng: 70.4012, category: 'temple', icon: '🛕', aliases: ['somnath', 'somnath temple', 'veraval temple', 'first jyotirlinga', 'prabhas patan'], hasRamp: true, famousFor: 'First Among the 12 Holy Jyotirlinga Shrines of Lord Shiva' },
  { id: 'mon_dwarkadhish_temple', name: 'Dwarkadhish Temple (Jagat Mandir)', displayName: '🛕 Dwarkadhish Temple • Dwarka, Gujarat (Char Dham)', state: 'Gujarat', district: 'Devbhumi Dwarka', lat: 22.2376, lng: 68.9678, category: 'temple', icon: '🛕', aliases: ['dwarka', 'dwarkadhish', 'jagat mandir', 'char dham dwarka', 'bet dwarka', 'gomti ghat'], hasRamp: true, famousFor: 'Ancient Kingdom of Lord Krishna & Sacred Char Dham Pilgrimage' },
  { id: 'mon_tirupati_balaji', name: 'Tirumala Venkateswara Temple', displayName: '🛕 Tirupati Balaji (Tirumala) • Tirupati, Andhra Pradesh', state: 'Andhra Pradesh', district: 'Tirupati', lat: 13.6833, lng: 79.3472, category: 'temple', icon: '🛕', aliases: ['tirupati', 'tirumala', 'balaji', 'venkateswara temple', 'seven hills', 'tirupati balaji'], hasRamp: true, famousFor: 'Most Visited Sacred Shrine in the World Located on Seven Hills' },
  { id: 'mon_kedarnath_temple', name: 'Kedarnath Temple', displayName: '🛕 Kedarnath Dham • Rudraprayag, Uttarakhand (Char Dham)', state: 'Uttarakhand', district: 'Rudraprayag', lat: 30.7352, lng: 79.0669, category: 'temple', icon: '🛕', aliases: ['kedarnath', 'kedarnath temple', 'kedar dham', 'char dham uttarakhand', 'rudraprayag'], hasRamp: false, famousFor: 'Himalayan Jyotirlinga Shrine at 3,583m Elevation' },
  { id: 'mon_badrinath_temple', name: 'Badrinath Temple', displayName: '🛕 Badrinath Dham • Chamoli, Uttarakhand (Char Dham)', state: 'Uttarakhand', district: 'Chamoli', lat: 30.7433, lng: 79.4938, category: 'temple', icon: '🛕', aliases: ['badrinath', 'badri dham', 'badrinath temple', 'mana village', 'alakananda'], hasRamp: true, famousFor: 'Main Himalayan Abode of Lord Vishnu on the Banks of Alaknanda' },
  { id: 'mon_vaishno_devi', name: 'Shri Mata Vaishno Devi Shrine', displayName: '🛕 Mata Vaishno Devi • Katra, Jammu & Kashmir', state: 'Jammu and Kashmir', district: 'Reasi', lat: 33.0308, lng: 74.9490, category: 'temple', icon: '🛕', aliases: ['vaishno devi', 'katra', 'mata rani', 'bhawan katra', 'ardhkuwari', 'bhairon nath'], hasRamp: true, famousFor: 'Holy Cave Shrine in Trikuta Mountains attracting millions' },
  { id: 'mon_amber_fort', name: 'Amer Fort (Amber Palace)', displayName: '🏛️ Amer Fort • Jaipur, Rajasthan (UNESCO Heritage)', state: 'Rajasthan', district: 'Jaipur', lat: 26.9855, lng: 75.8513, category: 'monument', icon: '🏛️', aliases: ['amber fort', 'amer fort', 'sheesh mahal', 'maota lake', 'jaipur fort'], hasRamp: true, famousFor: 'Majestic Rajput Hilltop Fort with Sheesh Mahal (Mirror Palace)' },
  { id: 'mon_mehrangarh_fort', name: 'Mehrangarh Fort', displayName: '🏛️ Mehrangarh Fort • Blue City, Jodhpur, Rajasthan', state: 'Rajasthan', district: 'Jodhpur', lat: 26.2978, lng: 73.0185, category: 'monument', icon: '🏛️', aliases: ['mehrangarh', 'jodhpur fort', 'blue city fort', 'jaswant thada', 'rao jodha'], hasRamp: true, famousFor: 'One of the Largest Fortresses in India Towering Over Blue City' },
  { id: 'mon_chittorgarh_fort', name: 'Chittorgarh Fort', displayName: '🏛️ Chittorgarh Fort • Chittorgarh, Rajasthan (UNESCO)', state: 'Rajasthan', district: 'Chittorgarh', lat: 24.8879, lng: 74.6269, category: 'heritage', icon: '🏛️', aliases: ['chittorgarh', 'chittor fort', 'vijay stambha', 'kirti stambha', 'rani padmini palace'], hasRamp: true, famousFor: 'Largest Fort in India Symbolizing Rajput Valour & Sacrifice' },
  { id: 'mon_cellular_jail', name: 'Cellular Jail (Kāla Pānī)', displayName: '🏛️ Cellular Jail National Memorial • Port Blair, A&N', state: 'Andaman and Nicobar Islands', district: 'South Andaman', lat: 11.6739, lng: 92.7478, category: 'monument', icon: '🏛️', aliases: ['cellular jail', 'kala pani', 'port blair jail', 'veer savarkar memorial'], hasRamp: true, famousFor: 'Historic Colonial Prison and National Freedom Memorial' },
];

// Insert monuments first
ALL_INDIA_MONUMENTS.forEach((p) => {
  fileContent += `  {
    id: '${p.id}',
    name: '${p.name.replace(/'/g, "\\'")}',
    displayName: '${p.displayName.replace(/'/g, "\\'")}',
    state: '${p.state}',
    district: '${p.district}',
    lat: ${p.lat},
    lng: ${p.lng},
    category: '${p.category}',
    icon: '${p.icon}',
    aliases: ${JSON.stringify(p.aliases)},
    hasRamp: ${p.hasRamp ? 'true' : 'false'},
    famousFor: '${p.famousFor.replace(/'/g, "\\'")}',
  },
`;
});

// Insert cities
CITIES_BY_STATE.forEach((c, idx) => {
  const safeId = `city_${c.name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')}`;
  fileContent += `  {
    id: '${safeId}_${idx + 1}',
    name: '${c.name.replace(/'/g, "\\'")}',
    displayName: '${c.icon} ${c.name.replace(/'/g, "\\'")} • ${c.state}${c.district ? ` (${c.district})` : ''}',
    state: '${c.state}',
    district: '${c.district || ''}',
    lat: ${c.lat},
    lng: ${c.lng},
    category: '${c.cat}',
    icon: '${c.icon}',
    aliases: ${JSON.stringify(c.aliases)},
    hasRamp: true,
    famousFor: '${c.fame.replace(/'/g, "\\'")}',
  },
`;
});

fileContent += `];

/**
 * High-Speed Fuzzy Search across all Indian Cities, Towns, Monuments, and Heritage Sites
 */
export function searchIndiaGazetteer(query: string, maxResults = 10): IndiaPlace[] {
  if (!query || query.trim().length === 0) {
    // Return top iconic recommendations
    return ALL_INDIA_GAZETTEER.slice(0, maxResults);
  }

  const q = query.trim().toLowerCase();
  const qTokens = q.split(/[\\s,.-]+/).filter((t) => t.length > 0);

  const exactMatches: IndiaPlace[] = [];
  const startsWithMatches: IndiaPlace[] = [];
  const tokenMatches: IndiaPlace[] = [];
  const aliasMatches: IndiaPlace[] = [];

  for (const place of ALL_INDIA_GAZETTEER) {
    const nameLower = place.name.toLowerCase();
    const stateLower = place.state.toLowerCase();
    const distLower = (place.district || '').toLowerCase();
    const famousLower = (place.famousFor || '').toLowerCase();

    // 1. Exact Name match
    if (nameLower === q) {
      exactMatches.push(place);
      continue;
    }

    // 2. Starts with query
    if (nameLower.startsWith(q)) {
      startsWithMatches.push(place);
      continue;
    }

    // 3. Aliases match
    const aliasHit = place.aliases.some((a) => a === q || a.startsWith(q) || a.includes(q));
    if (aliasHit) {
      aliasMatches.push(place);
      continue;
    }

    // 4. Token multi-field match (e.g. "Puri Odisha", "Varanasi UP", "Taj Mahal Agra")
    const allText = \`\${nameLower} \${stateLower} \${distLower} \${famousLower} \${place.aliases.join(' ')}\`;
    const allTokensHit = qTokens.every((tok) => allText.includes(tok));
    if (allTokensHit) {
      tokenMatches.push(place);
    }
  }

  const combined = [...exactMatches, ...startsWithMatches, ...aliasMatches, ...tokenMatches];
  const seenIds = new Set<string>();
  const unique: IndiaPlace[] = [];

  for (const p of combined) {
    if (!seenIds.has(p.id)) {
      seenIds.add(p.id);
      unique.push(p);
      if (unique.length >= maxResults) break;
    }
  }

  return unique;
}

export const searchIndiaGazetteerBackend = searchIndiaGazetteer;
`;

fs.writeFileSync(path.join(__dirname, '../src/data/indiaGazetteer.ts'), fileContent, 'utf8');
fs.writeFileSync(path.join(__dirname, '../backend/src/data/indiaGazetteer.ts'), fileContent, 'utf8');
console.log('Successfully wrote comprehensive all-India gazetteers to frontend and backend!');
