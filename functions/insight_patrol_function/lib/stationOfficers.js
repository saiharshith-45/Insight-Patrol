'use strict';

/**
 * Station / beat officer directory for patrol assign dropdown.
 * Contact phones inspired by Bengaluru City Police public contact lists (demo).
 */

const STATION_OFFICERS = [
  { id: 'ST-CCPS-SHO', rank: 'Inspector / SHO', name: 'K. Ramesh', station_key: 'CCPS-BLR', station: 'Cyber Crime PS, Bengaluru City', phone: '080-2294-2100', beat_ids: ['BEAT-KOR-01', 'BEAT-MG-01'] },
  { id: 'ST-CCPS-PSI', rank: 'PSI', name: 'A. Naveen', station_key: 'CCPS-BLR', station: 'Cyber Crime PS, Bengaluru City', phone: '94808-01201', beat_ids: ['BEAT-KOR-01'] },
  { id: 'ST-CCPS-ASI', rank: 'ASI', name: 'R. Mahesh', station_key: 'CCPS-BLR', station: 'Cyber Crime PS, Bengaluru City', phone: '94808-01202', beat_ids: ['BEAT-KOR-01', 'BEAT-MG-01'] },
  { id: 'ST-IND-SHO', rank: 'Inspector / SHO', name: 'P. Suresh', station_key: 'INDIRANAGAR-PS', station: 'Indiranagar Police Station', phone: '080-2294-2658', beat_ids: ['BEAT-IND-01'] },
  { id: 'ST-IND-PSI', rank: 'PSI', name: 'S. Kavitha', station_key: 'INDIRANAGAR-PS', station: 'Indiranagar Police Station', phone: '94808-01816', beat_ids: ['BEAT-IND-01'] },
  { id: 'ST-IND-HC', rank: 'Head Constable', name: 'Sunil B', station_key: 'INDIRANAGAR-PS', station: 'Indiranagar Police Station', phone: '94808-01817', beat_ids: ['BEAT-IND-01'] },
  { id: 'ST-IND-PC', rank: 'Police Constable', name: 'Ganesh K', station_key: 'INDIRANAGAR-PS', station: 'Indiranagar Police Station', phone: '94808-01818', beat_ids: ['BEAT-IND-01'] },
  { id: 'ST-WF-SHO', rank: 'Inspector / SHO', name: 'K. Prakash', station_key: 'WHITEFIELD-PS', station: 'Whitefield Police Station', phone: '080-2294-2800', beat_ids: ['BEAT-WF-01'] },
  { id: 'ST-WF-PSI', rank: 'PSI', name: 'L. Meena', station_key: 'WHITEFIELD-PS', station: 'Whitefield Police Station', phone: '94808-01901', beat_ids: ['BEAT-WF-01'] },
  { id: 'ST-WF-HC', rank: 'Head Constable', name: 'Ravi C', station_key: 'WHITEFIELD-PS', station: 'Whitefield Police Station', phone: '94808-01902', beat_ids: ['BEAT-WF-01'] },
  { id: 'ST-WF-PC', rank: 'Police Constable', name: 'Anand P', station_key: 'WHITEFIELD-PS', station: 'Whitefield Police Station', phone: '94808-01903', beat_ids: ['BEAT-WF-01'] },
  { id: 'ST-JAY-SHO', rank: 'Inspector / SHO', name: 'N. Sharath', station_key: 'JAYANAGAR-PS', station: 'Jayanagar Police Station', phone: '080-2294-2700', beat_ids: ['BEAT-JAY-01'] },
  { id: 'ST-JAY-HC', rank: 'Head Constable', name: 'Manjunath S', station_key: 'JAYANAGAR-PS', station: 'Jayanagar Police Station', phone: '94808-02001', beat_ids: ['BEAT-JAY-01'] },
  { id: 'ST-JAY-PC', rank: 'Police Constable', name: 'Yogesh T', station_key: 'JAYANAGAR-PS', station: 'Jayanagar Police Station', phone: '94808-02002', beat_ids: ['BEAT-JAY-01'] },
  { id: 'ST-YEL-SHO', rank: 'Inspector / SHO', name: 'B. Harish', station_key: 'YELAHANKA-PS', station: 'Yelahanka Police Station', phone: '080-2294-2900', beat_ids: ['BEAT-YEL-01'] },
  { id: 'ST-YEL-HC', rank: 'Head Constable', name: 'Pradeep M', station_key: 'YELAHANKA-PS', station: 'Yelahanka Police Station', phone: '94808-02101', beat_ids: ['BEAT-YEL-01'] },
  { id: 'ST-YEL-PC', rank: 'Police Constable', name: 'Santhosh R', station_key: 'YELAHANKA-PS', station: 'Yelahanka Police Station', phone: '94808-02102', beat_ids: ['BEAT-YEL-01'] },
  { id: 'ST-MG-HC', rank: 'Head Constable', name: 'Imran Khan', station_key: 'ASHOKNAGAR-PS', station: 'Ashok Nagar / MG Road beat', phone: '94808-01823', beat_ids: ['BEAT-MG-01', 'BEAT-MAJ-01'] },
  { id: 'ST-MG-PC', rank: 'Police Constable', name: 'Vishal N', station_key: 'ASHOKNAGAR-PS', station: 'Ashok Nagar / MG Road beat', phone: '94808-01824', beat_ids: ['BEAT-MG-01', 'BEAT-MAJ-01', 'BEAT-EC-01'] },
  { id: 'ST-KG-HC', rank: 'Head Constable', name: 'Faisal Ahmed', station_key: 'KG HALLI-PS', station: 'K.G. Halli Police Station', phone: '94808-02201', beat_ids: ['BEAT-KG-01'] },
  { id: 'ST-KG-PC', rank: 'Police Constable', name: 'Nithin Rao', station_key: 'KG HALLI-PS', station: 'K.G. Halli Police Station', phone: '94808-02202', beat_ids: ['BEAT-KG-01'] },
  { id: 'ST-MYS-HC', rank: 'Head Constable', name: 'Suresh M', station_key: 'NAZARABAD-PS', station: 'Nazarabad Police Station, Mysuru', phone: '94808-03001', beat_ids: ['BEAT-MYS-01'] },
  { id: 'ST-MNG-HC', rank: 'Head Constable', name: 'Akshay Shetty', station_key: 'PANDESHWAR-PS', station: 'Pandeshwar Police Station, Mangaluru', phone: '94808-03101', beat_ids: ['BEAT-MNG-01'] },
  { id: 'ST-HUB-HC', rank: 'Head Constable', name: 'Basavaraj P', station_key: 'HUBBALLI EAST-PS', station: 'Hubballi East Police Station', phone: '94808-03201', beat_ids: ['BEAT-HUB-01'] },
  { id: 'ST-BEL-HC', rank: 'Head Constable', name: 'Rohit Patil', station_key: 'APMC-PS', station: 'APMC Police Station, Belagavi', phone: '94808-03301', beat_ids: ['BEAT-BEL-01'] },
  { id: 'ST-DVG-HC', rank: 'Head Constable', name: 'Kiran G', station_key: 'DAVANAGERE EAST-PS', station: 'Davanagere East Police Station', phone: '94808-03401', beat_ids: ['BEAT-DVG-01'] },
];

function officersForBeat(beatId) {
  const list = STATION_OFFICERS.filter((o) => (o.beat_ids || []).includes(beatId));
  return list.length ? list : STATION_OFFICERS.filter((o) => /Constable|Head Constable|PSI|ASI/.test(o.rank));
}

function allStationOfficers() {
  return STATION_OFFICERS;
}

module.exports = {
  STATION_OFFICERS,
  officersForBeat,
  allStationOfficers,
};
