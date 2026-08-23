/**
 * KIIT Deemed to be University & KISS Complete Campus, Hostel & Landmark Database
 * Verified exact Google Maps coordinates, campus numbers, school faculties,
 * King's Palace (KP) boys hostels, and Queen's Castle (QC) girls hostels.
 */

export interface KIITLocation {
  id: string;
  name: string;
  campusNumber?: number | string;
  category: 'campus' | 'kp_hostel' | 'qc_hostel' | 'hospital' | 'sports' | 'landmark';
  facultyOrDescription: string;
  displayName: string;
  lat: number;
  lng: number;
  aliases: string[];
  hasRamp: boolean;
}

export const KIIT_CAMPUS_DATABASE: KIITLocation[] = [
  // ==========================================
  // ACADEMIC & INSTITUTIONAL CAMPUSES (1 to 25+)
  // ==========================================
  {
    id: 'kiit_c1',
    name: 'KIIT Campus 1 (KSOM)',
    campusNumber: 1,
    category: 'campus',
    facultyOrDescription: 'School of Management (KSOM) & Rural Management',
    displayName: '🎓 KIIT Campus 1 • School of Management (KSOM)',
    lat: 20.3524,
    lng: 85.8164,
    aliases: ['1', 'c1', 'c-1', 'campus 1', 'campus1', 'ksom', 'management', 'mba', 'bba', 'kiit 1'],
    hasRamp: true,
  },
  {
    id: 'kiit_c2',
    name: 'KIIT Campus 2 (KIMS)',
    campusNumber: 2,
    category: 'hospital',
    facultyOrDescription: 'Kalinga Institute of Medical Sciences (KIMS Hospital & Dental College)',
    displayName: '🏥 KIIT Campus 2 • KIMS Medical Hospital & Dental College',
    lat: 20.3541,
    lng: 85.8142,
    aliases: ['2', 'c2', 'c-2', 'campus 2', 'campus2', 'kims', 'medical', 'hospital', 'dental', 'doctor', 'kiit 2'],
    hasRamp: true,
  },
  {
    id: 'kiit_c3',
    name: 'KIIT Campus 3 (Civil & Mechanical)',
    campusNumber: 3,
    category: 'campus',
    facultyOrDescription: 'School of Civil Engineering & Mechanical Engineering, Main Auditorium',
    displayName: '🎓 KIIT Campus 3 • Civil & Mechanical Engineering, Auditorium',
    lat: 20.3508,
    lng: 85.8190,
    aliases: ['3', 'c3', 'c-3', 'campus 3', 'campus3', 'civil', 'auditorium', 'kiit auditorium', 'kiit 3'],
    hasRamp: true,
  },
  {
    id: 'kiit_c3_oat',
    name: 'KIIT Campus 3 OAT (Open Air Theatre)',
    campusNumber: 3,
    category: 'campus',
    facultyOrDescription: 'Campus 3 Open Air Theatre (OAT) • Campus EV Shuttle Terminus & Drop Point',
    displayName: '🎭 KIIT Campus 3 OAT • EV Shuttle Terminus',
    lat: 20.352709,
    lng: 85.816379,
    aliases: ['oat', 'campus 3 oat', 'c3 oat', 'c3oat', 'open air theatre', 'kiit oat', 'oat campus 3'],
    hasRamp: true,
  },
  {
    id: 'kiit_c4',
    name: 'KIIT Campus 4 (Electrical)',
    campusNumber: 4,
    category: 'campus',
    facultyOrDescription: 'School of Electrical & Electronics Engineering (EEE)',
    displayName: '🎓 KIIT Campus 4 • School of Electrical Engineering (EEE)',
    lat: 20.3547,
    lng: 85.8172,
    aliases: ['4', 'c4', 'c-4', 'campus 4', 'campus4', 'eee', 'electrical', 'kiit 4'],
    hasRamp: true,
  },
  {
    id: 'kiit_c5',
    name: 'KIIT Campus 5 (Old CSE)',
    campusNumber: 5,
    category: 'campus',
    facultyOrDescription: 'School of Computer Science & Engineering (Old CSE Block)',
    displayName: '🎓 KIIT Campus 5 • School of Computer Engineering (Old Block)',
    lat: 20.3533,
    lng: 85.8195,
    aliases: ['5', 'c5', 'c-5', 'campus 5', 'campus5', 'cse', 'computer science', 'kiit 5'],
    hasRamp: true,
  },
  {
    id: 'kiit_c6',
    name: 'KIIT Campus 6 (Central Library & IT)',
    campusNumber: 6,
    category: 'campus',
    facultyOrDescription: 'Central Library, School of Computer Applications & IT Block',
    displayName: '📚 KIIT Campus 6 • Central Library & IT Block',
    lat: 20.3555,
    lng: 85.8188,
    aliases: ['6', 'c6', 'c-6', 'campus 6', 'campus6', 'library', 'central library', 'it block', 'bca', 'mca', 'kiit 6'],
    hasRamp: true,
  },
  {
    id: 'kiit_c7',
    name: 'KIIT Campus 7 (Electronics)',
    campusNumber: 7,
    category: 'campus',
    facultyOrDescription: 'School of Electronics Engineering (ETC / ECE)',
    displayName: '🎓 KIIT Campus 7 • School of Electronics Engineering (ECE)',
    lat: 20.3518,
    lng: 85.8180,
    aliases: ['7', 'c7', 'c-7', 'campus 7', 'campus7', 'etc', 'ece', 'electronics', 'kiit 7'],
    hasRamp: true,
  },
  {
    id: 'kiit_c8',
    name: 'KIIT Campus 8 (Mechanical Workshop)',
    campusNumber: 8,
    category: 'campus',
    facultyOrDescription: 'School of Mechanical Engineering Workshop & Innovation Labs',
    displayName: '🔧 KIIT Campus 8 • Mechanical Engineering Workshop & Labs',
    lat: 20.3512,
    lng: 85.8202,
    aliases: ['8', 'c8', 'c-8', 'campus 8', 'campus8', 'mech', 'workshop', 'mechanical', 'kiit 8'],
    hasRamp: true,
  },
  {
    id: 'kiit_c9',
    name: 'KIIT Campus 9 (KIIT International School)',
    campusNumber: 9,
    category: 'campus',
    facultyOrDescription: 'KIIT International School (KIS) & Sports Arena',
    displayName: '🏫 KIIT Campus 9 • KIIT International School (KIS)',
    lat: 20.3568,
    lng: 85.8210,
    aliases: ['9', 'c9', 'c-9', 'campus 9', 'campus9', 'kis', 'international school', 'kiit school', 'kiit 9'],
    hasRamp: true,
  },
  {
    id: 'kiit_c10',
    name: 'KIIT Campus 10 (KISS Campus)',
    campusNumber: 10,
    category: 'campus',
    facultyOrDescription: 'Kalinga Institute of Social Sciences (KISS Campus)',
    displayName: '🏛️ KIIT Campus 10 • KISS (Kalinga Institute of Social Sciences)',
    lat: 20.3662,
    lng: 85.8105,
    aliases: ['10', 'c10', 'c-10', 'campus 10', 'campus10', 'kiss', 'kalinga institute of social sciences', 'kiit 10'],
    hasRamp: true,
  },
  {
    id: 'kiit_c11',
    name: 'KIIT Campus 11 (Biotechnology & TBI)',
    campusNumber: 11,
    category: 'campus',
    facultyOrDescription: 'School of Biotechnology & KIIT-TBI • EV-4 Shuttle Terminus',
    displayName: '🧬 KIIT Campus 11 • School of Biotechnology & KIIT-TBI',
    lat: 20.358310,
    lng: 85.821621,
    aliases: ['11', 'c11', 'c-11', 'campus 11', 'campus11', 'biotech', 'biotechnology', 'tbi', 'incubator', 'kiit 11'],
    hasRamp: true,
  },
  {
    id: 'kiit_c12',
    name: 'KIIT Campus 12 (Film, Media & KP Hub)',
    campusNumber: 12,
    category: 'campus',
    facultyOrDescription: 'School of Film & Media Sciences & Campus 12 Complex • EV-5 Shuttle Stand',
    displayName: '🎬 KIIT Campus 12 • Film & Media Sciences, Campus 12',
    lat: 20.352367,
    lng: 85.819374,
    aliases: ['12', 'c12', 'c-12', 'campus 12', 'campus12', 'film and media', 'film media', 'media science', 'kiit 12'],
    hasRamp: true,
  },
  {
    id: 'kiit_c13',
    name: 'KIIT Campus 13 (Fashion & Campus 13 Entrance)',
    campusNumber: 13,
    category: 'campus',
    facultyOrDescription: 'KIIT Campus 13 Main Entrance & Fashion Technology • EV-1 Shuttle Drop Point',
    displayName: '🎬 KIIT Campus 13 Entrance • Fashion & Media Complex',
    lat: 20.356383,
    lng: 85.818454,
    aliases: ['13', 'c13', 'c-13', 'campus 13', 'campus13', 'campus 13 entrance', 'fashion', 'ksft', 'kiit 13'],
    hasRamp: true,
  },
  {
    id: 'kiit_c14',
    name: 'KIIT Campus 14 (Architecture & Planning)',
    campusNumber: 14,
    category: 'campus',
    facultyOrDescription: 'School of Architecture & Planning (KSAP) • EV-2 & EV-3 Shuttle Drop Stand',
    displayName: '📐 KIIT Campus 14 • School of Architecture & Planning',
    lat: 20.355989,
    lng: 85.815397,
    aliases: ['14', 'c14', 'c-14', 'campus 14', 'campus14', 'architecture', 'ksap', 'design', 'planning', 'kiit 14'],
    hasRamp: true,
  },
  {
    id: 'kiit_c15',
    name: 'KIIT Campus 15 (School of Computer Engineering)',
    campusNumber: 15,
    category: 'campus',
    facultyOrDescription: 'School of Computer Engineering (Main CSE Block Campus 15)',
    displayName: '💻 KIIT Campus 15 • School of Computer Engineering (CSE)',
    lat: 20.3529,
    lng: 85.8242,
    aliases: ['15', 'c15', 'c-15', 'campus 15', 'campus15', 'cse 15', 'computer science 15', 'btech cse', 'kiit 15'],
    hasRamp: true,
  },
  {
    id: 'kiit_c15a',
    name: 'KIIT Campus 15A',
    campusNumber: '15A',
    category: 'campus',
    facultyOrDescription: 'KIIT Campus 15A Complex • EV Shuttle Boarding Stop',
    displayName: '🎓 KIIT Campus 15A • EV Shuttle Stop',
    lat: 20.348643,
    lng: 85.815884,
    aliases: ['15a', 'c15a', 'c-15a', 'campus 15a', 'campus15a', 'kiit 15a', 'kiit15a', '15 a'],
    hasRamp: true,
  },
  {
    id: 'kiit_c16',
    name: 'KIIT Campus 16 (School of Law - KLS)',
    campusNumber: 16,
    category: 'campus',
    facultyOrDescription: 'KIIT School of Law (KLS), Patia Main Campus',
    displayName: '⚖️ KIIT Campus 16 • KIIT School of Law (KLS)',
    lat: 20.3601,
    lng: 85.8245,
    aliases: ['16', 'c16', 'c-16', 'campus 16', 'campus16', 'kls', 'law', 'law school', 'advocate', 'kiit 16'],
    hasRamp: true,
  },
  {
    id: 'kiit_c17',
    name: 'KIIT Campus 17 (Applied Sciences)',
    campusNumber: 17,
    category: 'campus',
    facultyOrDescription: 'School of Applied Sciences & Humanities (Physics, Chemistry, Math)',
    displayName: '🔬 KIIT Campus 17 • School of Applied Sciences & Humanities',
    lat: 20.3538,
    lng: 85.8215,
    aliases: ['17', 'c17', 'c-17', 'campus 17', 'campus17', 'applied sciences', 'humanities', 'physics', 'chemistry', 'kiit 17'],
    hasRamp: true,
  },
  {
    id: 'kiit_c18',
    name: 'KIIT Campus 18 (Public Health & Nursing)',
    campusNumber: 18,
    category: 'campus',
    facultyOrDescription: 'KIMS School of Public Health & KINS Nursing College',
    displayName: '🏥 KIIT Campus 18 • School of Public Health & Nursing (KINS)',
    lat: 20.3548,
    lng: 85.8130,
    aliases: ['18', 'c18', 'c-18', 'campus 18', 'campus18', 'nursing', 'public health', 'kins', 'kiit 18'],
    hasRamp: true,
  },
  {
    id: 'kiit_c19',
    name: 'KIIT Campus 19 (KISS Higher Education)',
    campusNumber: 19,
    category: 'campus',
    facultyOrDescription: 'KISS Higher Education, Tribal Heritage & Research Wing',
    displayName: '🏛️ KIIT Campus 19 • KISS Higher Education & Research',
    lat: 20.3685,
    lng: 85.8090,
    aliases: ['19', 'c19', 'c-19', 'campus 19', 'campus19', 'kiss higher', 'tribal research', 'kiit 19'],
    hasRamp: true,
  },
  {
    id: 'kiit_c20',
    name: 'KIIT Campus 20 (Athletic Stadium & Sports Village)',
    campusNumber: 20,
    category: 'sports',
    facultyOrDescription: 'KIIT International Athletic Stadium, Olympic Swimming Pool & Sports Village',
    displayName: '🏟️ KIIT Campus 20 • Athletic Stadium & Sports Village',
    lat: 20.3595,
    lng: 85.8190,
    aliases: ['20', 'c20', 'c-20', 'campus 20', 'campus20', 'stadium', 'sports village', 'swimming pool', 'ground', 'kiit 20'],
    hasRamp: true,
  },
  {
    id: 'kiit_c21',
    name: 'KIIT Campus 21 (Convention Centre)',
    campusNumber: 21,
    category: 'landmark',
    facultyOrDescription: 'KIIT International Convention Centre, Banquet & University Guest House',
    displayName: '🏢 KIIT Campus 21 • International Convention Centre & Guest House',
    lat: 20.3540,
    lng: 85.8198,
    aliases: ['21', 'c21', 'c-21', 'campus 21', 'campus21', 'convention centre', 'guest house', 'banquet', 'kiit 21'],
    hasRamp: true,
  },
  {
    id: 'kiit_c22',
    name: 'KIIT Campus 22 (Rose Garden & Chintan)',
    campusNumber: 22,
    category: 'landmark',
    facultyOrDescription: 'Rose Garden, Chintan Research Block & Cultural Hub',
    displayName: '🌹 KIIT Campus 22 • Rose Garden & Chintan Cultural Complex',
    lat: 20.3515,
    lng: 85.8170,
    aliases: ['22', 'c22', 'c-22', 'campus 22', 'campus22', 'rose garden', 'chintan', 'kiit 22'],
    hasRamp: true,
  },
  {
    id: 'kiit_c25',
    name: 'KIIT Campus 25 (Polytechnic & ITI)',
    campusNumber: 25,
    category: 'campus',
    facultyOrDescription: 'KIIT Polytechnic & Industrial Training Institute (ITI)',
    displayName: '🏢 KIIT Campus 25 • KIIT Polytechnic & Skill Training Complex',
    lat: 20.363654,
    lng: 85.817526,
    aliases: ['25', 'c25', 'c-25', 'campus 25', 'campus25', 'polytechnic', 'iti', 'skill training', 'kiit 25'],
    hasRamp: true,
  },
  {
    id: 'kiit_c25_block_c',
    name: 'KIIT Campus 25 Block C',
    campusNumber: 25,
    category: 'campus',
    facultyOrDescription: 'Campus 25 Block C • EV-1, EV-2 & EV-3 Shuttle Starting Stand',
    displayName: '🏢 KIIT Campus 25 Block C • EV Starting Stand',
    lat: 20.363654,
    lng: 85.817526,
    aliases: ['c25 block c', 'campus 25 block c', 'block c campus 25', 'c25 c', 'campus 25 c', 'block c'],
    hasRamp: true,
  },

  // ==========================================
  // KING'S PALACE (KP) BOYS HOSTELS (KP 1 to KP 22)
  // ==========================================
  {
    id: 'kiit_kp1',
    name: 'King\'s Palace 1 (KP-1)',
    category: 'kp_hostel',
    facultyOrDescription: 'KP-1 Boys Hostel, Campus 3 Complex',
    displayName: '👑 King\'s Palace 1 (KP-1) • Boys Hostel (Campus 3)',
    lat: 20.3505,
    lng: 85.8188,
    aliases: ['kp1', 'kp 1', 'kp-1', 'kings palace 1', 'king palace 1', 'king\'s palace 1', 'kp', 'kings palace'],
    hasRamp: true,
  },
  {
    id: 'kiit_kp2',
    name: 'King\'s Palace 2 (KP-2)',
    category: 'kp_hostel',
    facultyOrDescription: 'KP-2 Boys Hostel, Campus 3 Complex',
    displayName: '👑 King\'s Palace 2 (KP-2) • Boys Hostel (Campus 3)',
    lat: 20.3502,
    lng: 85.8192,
    aliases: ['kp2', 'kp 2', 'kp-2', 'kings palace 2', 'king palace 2', 'king\'s palace 2', 'kp', 'kings palace'],
    hasRamp: true,
  },
  {
    id: 'kiit_kp3',
    name: 'King\'s Palace 3 (KP-3)',
    category: 'kp_hostel',
    facultyOrDescription: 'KP-3 Boys Hostel, Campus 4 Complex',
    displayName: '👑 King\'s Palace 3 (KP-3) • Boys Hostel (Campus 4)',
    lat: 20.3544,
    lng: 85.8175,
    aliases: ['kp3', 'kp 3', 'kp-3', 'kings palace 3', 'king palace 3', 'king\'s palace 3', 'kp', 'kings palace'],
    hasRamp: true,
  },
  {
    id: 'kiit_kp4',
    name: 'King\'s Palace 4 (KP-4)',
    category: 'kp_hostel',
    facultyOrDescription: 'KP-4 Boys Hostel, Campus 7 Electronics Area',
    displayName: '👑 King\'s Palace 4 (KP-4) • Boys Hostel (Campus 7)',
    lat: 20.3516,
    lng: 85.8185,
    aliases: ['kp4', 'kp 4', 'kp-4', 'kings palace 4', 'king palace 4', 'king\'s palace 4', 'kp', 'kings palace'],
    hasRamp: true,
  },
  {
    id: 'kiit_kp5',
    name: 'King\'s Palace 5 (KP-5)',
    category: 'kp_hostel',
    facultyOrDescription: 'KP-5 Boys Hostel, Campus 5 Computer Science Block',
    displayName: '👑 King\'s Palace 5 (KP-5) • Boys Hostel (Campus 5)',
    lat: 20.3536,
    lng: 85.8198,
    aliases: ['kp5', 'kp 5', 'kp-5', 'kings palace 5', 'king palace 5', 'king\'s palace 5', 'kp', 'kings palace'],
    hasRamp: true,
  },
  {
    id: 'kiit_kp6',
    name: 'King\'s Palace 6 (KP-6)',
    category: 'kp_hostel',
    facultyOrDescription: 'KP-6 Boys Hostel (International & Premium Block), Campus 6',
    displayName: '👑 King\'s Palace 6 (KP-6) • Boys Hostel (Campus 6 Library Side)',
    lat: 20.3558,
    lng: 85.8184,
    aliases: ['kp6', 'kp 6', 'kp-6', 'kings palace 6', 'king palace 6', 'king\'s palace 6', 'kp', 'kings palace'],
    hasRamp: true,
  },
  {
    id: 'kiit_kp7',
    name: 'King\'s Palace 7 (KP-7)',
    category: 'kp_hostel',
    facultyOrDescription: 'KP-7 Boys Hostel (A/B/C/D Blocks), Campus 12 Hub',
    displayName: '👑 King\'s Palace 7 (KP-7) • Boys Hostel (Campus 12)',
    lat: 20.3567,
    lng: 85.8160,
    aliases: ['kp7', 'kp 7', 'kp-7', 'kings palace 7', 'king palace 7', 'king\'s palace 7', 'kp', 'kings palace'],
    hasRamp: true,
  },
  {
    id: 'kiit_kp8',
    name: 'King\'s Palace 8 (KP-8)',
    category: 'kp_hostel',
    facultyOrDescription: 'KP-8 Boys Hostel, Campus 12 Complex',
    displayName: '👑 King\'s Palace 8 (KP-8) • Boys Hostel (Campus 12)',
    lat: 20.3569,
    lng: 85.8162,
    aliases: ['kp8', 'kp 8', 'kp-8', 'kings palace 8', 'king palace 8', 'king\'s palace 8', 'kp', 'kings palace'],
    hasRamp: true,
  },
  {
    id: 'kiit_kp9',
    name: 'King\'s Palace 9 (KP-9)',
    category: 'kp_hostel',
    facultyOrDescription: 'KP-9 Boys Hostel, Campus 12 Complex',
    displayName: '👑 King\'s Palace 9 (KP-9) • Boys Hostel (Campus 12)',
    lat: 20.3572,
    lng: 85.8166,
    aliases: ['kp9', 'kp 9', 'kp-9', 'kings palace 9', 'king palace 9', 'king\'s palace 9', 'kp', 'kings palace'],
    hasRamp: true,
  },
  {
    id: 'kiit_kp10',
    name: 'King\'s Palace 10 (KP-10)',
    category: 'kp_hostel',
    facultyOrDescription: 'KP-10 Boys Hostel, Campus 12 Complex',
    displayName: '👑 King\'s Palace 10 (KP-10) • Boys Hostel (Campus 12)',
    lat: 20.3575,
    lng: 85.8168,
    aliases: ['kp10', 'kp 10', 'kp-10', 'kings palace 10', 'king palace 10', 'king\'s palace 10', 'kp', 'kings palace'],
    hasRamp: true,
  },
  {
    id: 'kiit_kp11',
    name: 'King\'s Palace 11 (KP-11)',
    category: 'kp_hostel',
    facultyOrDescription: 'KP-11 Boys Hostel (International Wing), Campus 12',
    displayName: '👑 King\'s Palace 11 (KP-11) • International Boys Hostel (Campus 12)',
    lat: 20.3578,
    lng: 85.8171,
    aliases: ['kp11', 'kp 11', 'kp-11', 'kings palace 11', 'king palace 11', 'king\'s palace 11', 'kp', 'kings palace'],
    hasRamp: true,
  },
  {
    id: 'kiit_kp12',
    name: 'King\'s Palace 12 (KP-12)',
    category: 'kp_hostel',
    facultyOrDescription: 'KP-12 Boys Hostel, Campus 12 West Block',
    displayName: '👑 King\'s Palace 12 (KP-12) • Boys Hostel (Campus 12)',
    lat: 20.3581,
    lng: 85.8163,
    aliases: ['kp12', 'kp 12', 'kp-12', 'kings palace 12', 'king palace 12', 'king\'s palace 12', 'kp', 'kings palace'],
    hasRamp: true,
  },
  {
    id: 'kiit_kp14',
    name: 'King\'s Palace 14 (KP-14)',
    category: 'kp_hostel',
    facultyOrDescription: 'KP-14 Boys Hostel, Campus 15 CSE Side',
    displayName: '👑 King\'s Palace 14 (KP-14) • Boys Hostel (Campus 15)',
    lat: 20.3522,
    lng: 85.8248,
    aliases: ['kp14', 'kp 14', 'kp-14', 'kings palace 14', 'king palace 14', 'king\'s palace 14', 'kp', 'kings palace'],
    hasRamp: true,
  },
  {
    id: 'kiit_kp15',
    name: 'King\'s Palace 15 (KP-15)',
    category: 'kp_hostel',
    facultyOrDescription: 'KP-15 Boys Hostel, Campus 15 CSE Complex',
    displayName: '👑 King\'s Palace 15 (KP-15) • Boys Hostel (Campus 15)',
    lat: 20.3526,
    lng: 85.8252,
    aliases: ['kp15', 'kp 15', 'kp-15', 'kings palace 15', 'king palace 15', 'king\'s palace 15', 'kp', 'kings palace'],
    hasRamp: true,
  },
  {
    id: 'kiit_kp16',
    name: 'King\'s Palace 16 (KP-16)',
    category: 'kp_hostel',
    facultyOrDescription: 'KP-16 Boys Hostel, Campus 16 Law School Side',
    displayName: '👑 King\'s Palace 16 (KP-16) • Boys Hostel (Campus 16 Law)',
    lat: 20.3605,
    lng: 85.8240,
    aliases: ['kp16', 'kp 16', 'kp-16', 'kings palace 16', 'king palace 16', 'king\'s palace 16', 'kp', 'kings palace'],
    hasRamp: true,
  },
  {
    id: 'kiit_kp17',
    name: 'King\'s Palace 17 (KP-17)',
    category: 'kp_hostel',
    facultyOrDescription: 'KP-17 Boys Hostel, Campus 16 Law Complex',
    displayName: '👑 King\'s Palace 17 (KP-17) • Boys Hostel (Campus 16)',
    lat: 20.3608,
    lng: 85.8244,
    aliases: ['kp17', 'kp 17', 'kp-17', 'kings palace 17', 'king palace 17', 'king\'s palace 17', 'kp', 'kings palace'],
    hasRamp: true,
  },
  {
    id: 'kiit_kp18',
    name: 'King\'s Palace 18 (KP-18)',
    category: 'kp_hostel',
    facultyOrDescription: 'KP-18 Boys Hostel, Campus 14 Architecture Side',
    displayName: '👑 King\'s Palace 18 (KP-18) • Boys Hostel (Campus 14)',
    lat: 20.3585,
    lng: 85.8130,
    aliases: ['kp18', 'kp 18', 'kp-18', 'kings palace 18', 'king palace 18', 'king\'s palace 18', 'kp', 'kings palace'],
    hasRamp: true,
  },
  {
    id: 'kiit_kp19',
    name: 'King\'s Palace 19 (KP-19)',
    category: 'kp_hostel',
    facultyOrDescription: 'KP-19 Boys Hostel, Campus 14 Design Block',
    displayName: '👑 King\'s Palace 19 (KP-19) • Boys Hostel (Campus 14)',
    lat: 20.3588,
    lng: 85.8134,
    aliases: ['kp19', 'kp 19', 'kp-19', 'kings palace 19', 'king palace 19', 'king\'s palace 19', 'kp', 'kings palace'],
    hasRamp: true,
  },
  {
    id: 'kiit_kp20',
    name: 'King\'s Palace 20 (KP-20)',
    category: 'kp_hostel',
    facultyOrDescription: 'KP-20 Boys Hostel, Campus 15 Extended Complex',
    displayName: '👑 King\'s Palace 20 (KP-20) • Boys Hostel (Campus 15)',
    lat: 20.3531,
    lng: 85.8258,
    aliases: ['kp20', 'kp 20', 'kp-20', 'kings palace 20', 'king palace 20', 'king\'s palace 20', 'kp', 'kings palace'],
    hasRamp: true,
  },

  // ==========================================
  // QUEEN'S CASTLE (QC) GIRLS HOSTELS (QC 1 to QC 17)
  // ==========================================
  {
    id: 'kiit_qc1',
    name: 'Queen\'s Castle 1 (QC-1)',
    category: 'qc_hostel',
    facultyOrDescription: 'QC-1 Girls Hostel • Campus EV Shuttle Starting Point',
    displayName: '👸 Queen\'s Castle 1 (QC-1) • Campus EV Starting Stand',
    lat: 20.352367,
    lng: 85.819374,
    aliases: ['qc1', 'qc 1', 'qc-1', 'queens castle 1', 'queen castle 1', 'queen\'s castle 1', 'qc', 'queens castle', 'queens'],
    hasRamp: true,
  },
  {
    id: 'kiit_qc2',
    name: 'Queen\'s Castle 2 (QC-2)',
    category: 'qc_hostel',
    facultyOrDescription: 'QC-2 Girls Hostel, Campus 3 Area',
    displayName: '👸 Queen\'s Castle 2 (QC-2) • Girls Hostel (Campus 3)',
    lat: 20.3506,
    lng: 85.8197,
    aliases: ['qc2', 'qc 2', 'qc-2', 'queens castle 2', 'queen castle 2', 'queen\'s castle 2', 'qc', 'queens castle', 'queens'],
    hasRamp: true,
  },
  {
    id: 'kiit_qc3',
    name: 'Queen\'s Castle 3 (QC-3)',
    category: 'qc_hostel',
    facultyOrDescription: 'QC-3 Girls Hostel, Campus 4 EEE Side',
    displayName: '👸 Queen\'s Castle 3 (QC-3) • Girls Hostel (Campus 4)',
    lat: 20.3549,
    lng: 85.8178,
    aliases: ['qc3', 'qc 3', 'qc-3', 'queens castle 3', 'queen castle 3', 'queen\'s castle 3', 'qc', 'queens castle', 'queens'],
    hasRamp: true,
  },
  {
    id: 'kiit_qc4',
    name: 'Queen\'s Castle 4 (QC-4)',
    category: 'qc_hostel',
    facultyOrDescription: 'QC-4 Girls Hostel, Campus 5 CSE Side',
    displayName: '👸 Queen\'s Castle 4 (QC-4) • Girls Hostel (Campus 5)',
    lat: 20.3530,
    lng: 85.8202,
    aliases: ['qc4', 'qc 4', 'qc-4', 'queens castle 4', 'queen castle 4', 'queen\'s castle 4', 'qc', 'queens castle', 'queens'],
    hasRamp: true,
  },
  {
    id: 'kiit_qc5',
    name: 'Queen\'s Castle 5 (QC-5 / Campus 17)',
    category: 'qc_hostel',
    facultyOrDescription: 'QC-5 Girls Hostel & Campus 17 Complex • EV Shuttle Boarding Stop',
    displayName: '👸 Queen\'s Castle 5 (QC-5) • Campus 17 EV Stop',
    lat: 20.349176,
    lng: 85.819399,
    aliases: ['qc5', 'qc 5', 'qc-5', 'queens castle 5', 'queen castle 5', 'queen\'s castle 5', 'campus 17', 'c17', 'qc', 'queens castle'],
    hasRamp: true,
  },
  {
    id: 'kiit_qc6',
    name: 'Queen\'s Castle 6 (QC-6)',
    category: 'qc_hostel',
    facultyOrDescription: 'QC-6 Girls Hostel, Campus 6 Library Side',
    displayName: '👸 Queen\'s Castle 6 (QC-6) • Girls Hostel (Campus 6)',
    lat: 20.3556,
    lng: 85.8180,
    aliases: ['qc6', 'qc 6', 'qc-6', 'queens castle 6', 'queen castle 6', 'queen\'s castle 6', 'qc', 'queens castle', 'queens'],
    hasRamp: true,
  },
  {
    id: 'kiit_qc7',
    name: 'Queen\'s Castle 7 (QC-7)',
    category: 'qc_hostel',
    facultyOrDescription: 'QC-7 Girls Hostel, Campus 12 Area',
    displayName: '👸 Queen\'s Castle 7 (QC-7) • Girls Hostel (Campus 12)',
    lat: 20.3565,
    lng: 85.8155,
    aliases: ['qc7', 'qc 7', 'qc-7', 'queens castle 7', 'queen castle 7', 'queen\'s castle 7', 'qc', 'queens castle', 'queens'],
    hasRamp: true,
  },
  {
    id: 'kiit_qc8',
    name: 'Queen\'s Castle 8 (QC-8)',
    category: 'qc_hostel',
    facultyOrDescription: 'QC-8 Girls Hostel (International Block), Campus 12',
    displayName: '👸 Queen\'s Castle 8 (QC-8) • International Girls Hostel (Campus 12)',
    lat: 20.3568,
    lng: 85.8152,
    aliases: ['qc8', 'qc 8', 'qc-8', 'queens castle 8', 'queen castle 8', 'queen\'s castle 8', 'qc', 'queens castle', 'queens'],
    hasRamp: true,
  },
  {
    id: 'kiit_qc9',
    name: 'Queen\'s Castle 9 (QC-9)',
    category: 'qc_hostel',
    facultyOrDescription: 'QC-9 Girls Hostel, Campus 12 Area',
    displayName: '👸 Queen\'s Castle 9 (QC-9) • Girls Hostel (Campus 12)',
    lat: 20.3571,
    lng: 85.8150,
    aliases: ['qc9', 'qc 9', 'qc-9', 'queens castle 9', 'queen castle 9', 'queen\'s castle 9', 'qc', 'queens castle', 'queens'],
    hasRamp: true,
  },
  {
    id: 'kiit_qc10',
    name: 'Queen\'s Castle 10 (QC-10)',
    category: 'qc_hostel',
    facultyOrDescription: 'QC-10 Girls Hostel, Campus 15 CSE Side',
    displayName: '👸 Queen\'s Castle 10 (QC-10) • Girls Hostel (Campus 15)',
    lat: 20.3535,
    lng: 85.8238,
    aliases: ['qc10', 'qc 10', 'qc-10', 'queens castle 10', 'queen castle 10', 'queen\'s castle 10', 'qc', 'queens castle', 'queens'],
    hasRamp: true,
  },
  {
    id: 'kiit_qc11',
    name: 'Queen\'s Castle 11 (QC-11)',
    category: 'qc_hostel',
    facultyOrDescription: 'QC-11 Girls Hostel, Campus 15 CSE Complex',
    displayName: '👸 Queen\'s Castle 11 (QC-11) • Girls Hostel (Campus 15)',
    lat: 20.3538,
    lng: 85.8235,
    aliases: ['qc11', 'qc 11', 'qc-11', 'queens castle 11', 'queen castle 11', 'queen\'s castle 11', 'qc', 'queens castle', 'queens'],
    hasRamp: true,
  },
  {
    id: 'kiit_qc12',
    name: 'Queen\'s Castle 12 (QC-12)',
    category: 'qc_hostel',
    facultyOrDescription: 'QC-12 Girls Hostel, Campus 16 Law School Side',
    displayName: '👸 Queen\'s Castle 12 (QC-12) • Girls Hostel (Campus 16 Law)',
    lat: 20.3602,
    lng: 85.8252,
    aliases: ['qc12', 'qc 12', 'qc-12', 'queens castle 12', 'queen castle 12', 'queen\'s castle 12', 'qc', 'queens castle', 'queens'],
    hasRamp: true,
  },
  {
    id: 'kiit_qc14',
    name: 'Queen\'s Castle 14 (QC-14)',
    category: 'qc_hostel',
    facultyOrDescription: 'QC-14 Girls Hostel, Campus 16 Law Complex',
    displayName: '👸 Queen\'s Castle 14 (QC-14) • Girls Hostel (Campus 16)',
    lat: 20.3606,
    lng: 85.8256,
    aliases: ['qc14', 'qc 14', 'qc-14', 'queens castle 14', 'queen castle 14', 'queen\'s castle 14', 'qc', 'queens castle', 'queens'],
    hasRamp: true,
  },
  {
    id: 'kiit_qc15',
    name: 'Queen\'s Castle 15 (QC-15)',
    category: 'qc_hostel',
    facultyOrDescription: 'QC-15 Girls Hostel, Campus 14 Architecture Side',
    displayName: '👸 Queen\'s Castle 15 (QC-15) • Girls Hostel (Campus 14)',
    lat: 20.3580,
    lng: 85.8135,
    aliases: ['qc15', 'qc 15', 'qc-15', 'queens castle 15', 'queen castle 15', 'queen\'s castle 15', 'qc', 'queens castle', 'queens'],
    hasRamp: true,
  },
  {
    id: 'kiit_qc16',
    name: 'Queen\'s Castle 16 (QC-16)',
    category: 'qc_hostel',
    facultyOrDescription: 'QC-16 Girls Hostel, Campus 11 Biotechnology Complex',
    displayName: '👸 Queen\'s Castle 16 (QC-16) • Girls Hostel (Campus 11 Biotech)',
    lat: 20.3550,
    lng: 85.8232,
    aliases: ['qc16', 'qc 16', 'qc-16', 'queens castle 16', 'queen castle 16', 'queen\'s castle 16', 'qc', 'queens castle', 'queens'],
    hasRamp: true,
  },

  // ==========================================
  // FAMOUS KIIT GATES & JUNCTIONS
  // ==========================================
  {
    id: 'kiit_gate1',
    name: 'KIIT Main Gate 1 (KIMS & Campus 1 Road)',
    category: 'landmark',
    facultyOrDescription: 'KIIT Gate 1, Chandaka Industrial Estate Main Entrance',
    displayName: '🚪 KIIT Main Gate 1 • KIMS & Campus 1 Avenue',
    lat: 20.3538,
    lng: 85.8155,
    aliases: ['gate 1', 'gate1', 'kiit gate 1', 'main gate', 'kims gate', 'kiit entrance'],
    hasRamp: true,
  },
  {
    id: 'kiit_gate2',
    name: 'KIIT Gate 2 (Campus 3 / Auditorium)',
    category: 'landmark',
    facultyOrDescription: 'KIIT Gate 2, Main Entrance for Campus 3 & 4',
    displayName: '🚪 KIIT Gate 2 • Campus 3 & Main Auditorium Entrance',
    lat: 20.3512,
    lng: 85.8178,
    aliases: ['gate 2', 'gate2', 'kiit gate 2', 'auditorium gate'],
    hasRamp: true,
  },
  {
    id: 'kiit_gate3',
    name: 'KIIT Gate 3 (Campus 6 / Central Library)',
    category: 'landmark',
    facultyOrDescription: 'KIIT Gate 3, Entrance to Central Library & IT Block',
    displayName: '🚪 KIIT Gate 3 • Central Library & Campus 6 Entrance',
    lat: 20.3550,
    lng: 85.8185,
    aliases: ['gate 3', 'gate3', 'kiit gate 3', 'library gate'],
    hasRamp: true,
  },
  {
    id: 'kiit_square',
    name: 'KIIT Square / Big Bazaar Chowk',
    category: 'landmark',
    facultyOrDescription: 'Central KIIT Square Junction, Patia Main Road',
    displayName: '🚏 KIIT Square Junction • Patia Main Road',
    lat: 20.3530,
    lng: 85.8160,
    aliases: ['kiit square', 'kiit chowk', 'patia chowk', 'big bazaar patia', 'square', 'junction'],
    hasRamp: true,
  },
];

/**
 * Default instant recommendations when search bar is focused or empty
 */
export function getDefaultKIITRecommendations(): KIITLocation[] {
  const prominentIds = [
    'kiit_c6',   // Campus 6 Central Library
    'kiit_c15',  // Campus 15 CSE
    'kiit_kp7',  // KP-7 Boys Hostel
    'kiit_qc5',  // QC-5 Girls Hostel
    'kiit_c2',   // Campus 2 KIMS Hospital
    'kiit_c3',   // Campus 3 Auditorium
    'kiit_c1',   // Campus 1 KSOM
    'kiit_c16',  // Campus 16 Law School
    'kiit_kp15', // KP-15 CSE Hostel
    'kiit_qc10', // QC-10 CSE Hostel
    'kiit_square', // KIIT Square
  ];
  return prominentIds
    .map((id) => KIIT_CAMPUS_DATABASE.find((item) => item.id === id))
    .filter(Boolean) as KIITLocation[];
}

/**
 * Search KIIT campus database with instant fuzzy matching for:
 * - Single letter: "c" (all campuses), "k" (all KIIT/KP), "q" (all QC), "p" (KP/Patia), "h" (hostels)
 * - Single numbers: "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "14", "15", "16", "17", "18", "20", "25"
 * - Shorthand prefixes: "cam", "camp", "c6", "c15", "kp", "kp7", "qc", "qc5"
 * - Acronyms: "cse", "ksom", "kims", "kls", "kiss", "lib", "audi", "law", "med", "bio", "arch"
 */
export function searchKIITDatabase(query: string): KIITLocation[] {
  if (!query || query.trim().length === 0) {
    return getDefaultKIITRecommendations();
  }

  const rawQ = query.trim().toLowerCase();
  const q = rawQ.replace(/['.]/g, '');
  const cleanQ = q.replace(/[\s-_]+/g, '');

  const results: Array<{ item: KIITLocation; score: number }> = [];

  // Match specific KP number (e.g. "kp 7", "kp7", "kp-7", "k7")
  const kpNumMatch = cleanQ.match(/^(?:kp|k)(\d+)$/);
  const targetKpNum = kpNumMatch ? parseInt(kpNumMatch[1], 10) : null;

  // Match specific QC number (e.g. "qc 5", "qc5", "qc-5", "q5")
  const qcNumMatch = cleanQ.match(/^(?:qc|q)(\d+)$/);
  const targetQcNum = qcNumMatch ? parseInt(qcNumMatch[1], 10) : null;

  // Match specific Campus number (e.g. "c6", "c-6", "campus 6", "6")
  const cNumMatch = cleanQ.match(/^(?:campus|c|kiit|kiitcampus)?(\d+)$/);
  const targetCampusNum = cNumMatch ? parseInt(cNumMatch[1], 10) : null;

  for (const item of KIIT_CAMPUS_DATABASE) {
    let score = 0;
    const nameClean = item.name.toLowerCase().replace(/['.]/g, '');
    const descClean = item.facultyOrDescription.toLowerCase().replace(/['.]/g, '');

    // 1. Exact Campus number match (e.g. "6", "c6", "campus 6", "15")
    if (targetCampusNum !== null && item.campusNumber) {
      const cNum = typeof item.campusNumber === 'number' ? item.campusNumber : parseInt(item.campusNumber, 10);
      if (cNum === targetCampusNum) {
        score = 1200;
      } else if (String(cNum).startsWith(String(targetCampusNum))) {
        score = 600;
      }
    }

    // 2. Exact KP number search (e.g. "kp 7" -> KP-7 gets top score)
    if (score === 0 && targetKpNum !== null && item.category === 'kp_hostel') {
      const itemKpNum = parseInt(item.name.replace(/[^0-9]/g, ''), 10);
      if (itemKpNum === targetKpNum) {
        score = 1100;
      } else if (String(itemKpNum).startsWith(String(targetKpNum))) {
        score = 550;
      }
    }

    // 3. Exact QC number search (e.g. "qc 5" -> QC-5 gets top score)
    if (score === 0 && targetQcNum !== null && item.category === 'qc_hostel') {
      const itemQcNum = parseInt(item.name.replace(/[^0-9]/g, ''), 10);
      if (itemQcNum === targetQcNum) {
        score = 1100;
      } else if (String(itemQcNum).startsWith(String(targetQcNum))) {
        score = 550;
      }
    }

    // 4. "c", "ca", "cam", "camp", "campus" -> prioritize all academic campuses
    if (score === 0 && (cleanQ === 'c' || cleanQ === 'ca' || cleanQ === 'cam' || cleanQ === 'camp' || cleanQ === 'campus')) {
      if (item.category === 'campus' || item.category === 'hospital' || item.category === 'sports') {
        score = 900 - (typeof item.campusNumber === 'number' ? item.campusNumber : 50);
      }
    }

    // 5. "kp", "k p", "kin", "king", "kings", "kingspalace" -> prioritize all KP hostels
    if (score === 0 && (cleanQ === 'kp' || cleanQ === 'kin' || cleanQ === 'king' || cleanQ === 'kings' || cleanQ === 'kingspalace' || cleanQ === 'kingpalace')) {
      if (item.category === 'kp_hostel') {
        score = 850;
      }
    }

    // 6. "qc", "q c", "que", "queen", "queens", "queenscastle" -> prioritize all QC hostels
    if (score === 0 && (cleanQ === 'qc' || cleanQ === 'que' || cleanQ === 'queen' || cleanQ === 'queens' || cleanQ === 'queenscastle' || cleanQ === 'queencastle')) {
      if (item.category === 'qc_hostel') {
        score = 850;
      }
    }

    // 7. "q" single letter -> prioritize QC hostels
    if (score === 0 && cleanQ === 'q') {
      if (item.category === 'qc_hostel') {
        score = 800;
      }
    }

    // 8. "k", "ki", "kii", "kiit" -> prioritize main KIIT campuses
    if (score === 0 && (cleanQ === 'k' || cleanQ === 'ki' || cleanQ === 'kii' || cleanQ === 'kiit')) {
      score = item.category === 'campus' ? 850 : 750;
    }

    // 9. "hostel", "boys", "girls"
    if (score === 0 && cleanQ === 'hostel') {
      if (item.category === 'kp_hostel' || item.category === 'qc_hostel') {
        score = 800;
      }
    }
    if (score === 0 && cleanQ === 'boys' && item.category === 'kp_hostel') {
      score = 800;
    }
    if (score === 0 && cleanQ === 'girls' && item.category === 'qc_hostel') {
      score = 800;
    }

    // 10. Direct alias matching
    if (score === 0) {
      for (const alias of item.aliases) {
        const aClean = alias.replace(/[\s-_]+/g, '');
        if (aClean === cleanQ || alias === q) {
          score = 950;
          break;
        } else if (aClean.startsWith(cleanQ) || alias.startsWith(q)) {
          score = Math.max(score, 700);
        } else if (aClean.includes(cleanQ) || alias.includes(q)) {
          score = Math.max(score, 500);
        }
      }
    }

    // 11. Name / description substring matching
    if (score === 0) {
      if (nameClean.includes(q)) {
        score = 400;
      } else if (descClean.includes(q)) {
        score = 300;
      }
    }

    if (score > 0) {
      results.push({ item, score });
    }
  }

  // Sort descending by relevance score
  results.sort((a, b) => b.score - a.score);
  return results.map((r) => r.item);
}
