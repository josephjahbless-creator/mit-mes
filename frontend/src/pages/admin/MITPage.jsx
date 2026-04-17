import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dataEntryApi } from '../../api';
import { BuildingOffice2Icon, UserGroupIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

// ─── Icon + type map ──────────────────────────────────────────────────────────
const DEPT_META = {
  DAHRM: { type: 'department', color: 'bg-blue-50 border-blue-200',     icon: '🏛️' },
  DID:   { type: 'department', color: 'bg-indigo-50 border-indigo-200', icon: '🏭' },
  DPP:   { type: 'department', color: 'bg-violet-50 border-violet-200', icon: '📋' },
  DTD:   { type: 'department', color: 'bg-sky-50 border-sky-200',       icon: '🤝' },
  DSME:  { type: 'department', color: 'bg-teal-50 border-teal-200',     icon: '🏪' },
  DTI:   { type: 'department', color: 'bg-cyan-50 border-cyan-200',     icon: '🌐' },
  FAU:   { type: 'unit',       color: 'bg-amber-50 border-amber-200',   icon: '💰' },
  PMU:   { type: 'unit',       color: 'bg-orange-50 border-orange-200', icon: '📦' },
  LSU:   { type: 'unit',       color: 'bg-rose-50 border-rose-200',     icon: '⚖️'  },
  ICTU:  { type: 'unit',       color: 'bg-emerald-50 border-emerald-200',icon: '💻' },
  GCU:   { type: 'unit',       color: 'bg-lime-50 border-lime-200',     icon: '📢' },
  IAU:   { type: 'unit',       color: 'bg-yellow-50 border-yellow-200', icon: '🔍' },
  MEU:   { type: 'unit',       color: 'bg-pink-50 border-pink-200',     icon: '📊' },
};

// ─── Full FORM 3B data per department (FY 2025/2026) ─────────────────────────
const fmt = n => n >= 1e9 ? `${(n/1e9).toFixed(2)}B` : n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `${(n/1e3).toFixed(0)}K` : (n?.toLocaleString() ?? '0');

const DEPT_DATA = {
  DAHRM: {
    subVote: '1001', budget: 5600000000,
    objectives: [
      {
        code: 'A', name: 'HIV/AIDS Infections and Non Communicable Diseases Reduced and Supportive Services Improved',
        targets: [
          { code: 'A03S', name: 'HIV/AIDS and Non-Communicable diseases intervention programmes implemented by June 2026', budget: 347750000,
            activities: [
              { code: 'A03S01', name: 'To support six (6) staff affected by HIV/AIDS with balanced diet, transportation, and provision of protective materials for non-communicable diseases by June 2026', budget: 25700000 },
              { code: 'A03S02', name: 'To hold four (4) meetings of the Ministerial Technical HIV/AIDS and non-communicable diseases committee by June 2026', budget: 23150000 },
              { code: 'A03S03', name: 'To conduct two (2) seminars on HIV/AIDS and non-communicable diseases for two hundred (200) MIT staff', budget: 27550000 },
              { code: 'A03S04', name: 'To facilitate MIT staffs with medical insurance and to attend seminars and workshops on NCD & CD issues by June 2026', budget: 271350000 },
            ],
          },
        ],
      },
      {
        code: 'B', name: 'Implementation of National Anti-Corruption Strategy enhanced and sustained',
        targets: [
          { code: 'B01S', name: 'Anti-corruption Programme implemented by June 2026', budget: 39800000,
            activities: [
              { code: 'B01S01', name: 'To conduct two (2) stakeholder meetings on anti-corruption at MIT by June 2026', budget: 13300000 },
              { code: 'B01S02', name: 'To develop an MIT anti-corruption action plan and prepare a national anti-corruption strategy at MIT by June 2026', budget: 19000000 },
              { code: 'B01S03', name: 'To enhance the anti-corruption-free zone at MIT by June 2026', budget: 7500000 },
            ],
          },
          { code: 'B02S', name: 'Public Service Code of conducts and good practice guidelines implemented by June 2026', budget: 64900000,
            activities: [
              { code: 'B02S01', name: 'To conduct two (2) seminars on ethical conduct, corruption, and good governance for two hundred (200) employees by June 2026', budget: 31500000 },
              { code: 'B02S02', name: 'To hold four (4) meetings for the Ministerial Integrity Committee and to facilitate Disciplinary Committee matters by June 2026', budget: 29700000 },
              { code: 'B02S03', name: 'To facilitate the availability of public service ethical guidelines, rules, regulations, laws, and circulars by June 2026', budget: 3700000 },
            ],
          },
        ],
      },
      {
        code: 'F', name: 'Ministry capacity to deliver mandated functions improved',
        targets: [
          { code: 'F01S', name: 'Human Resource Development Plan implemented by June 2026', budget: 238600000,
            activities: [
              { code: 'F01S01', name: 'To review the MIT job listing, leave the roster, seniority list, and retirement roster by June 2026', budget: 27700000 },
              { code: 'F01S02', name: 'To prepare and submit Personnel Emoluments (PE) estimates to the President\'s Office of Public Service Management and Good Governance by June 2026', budget: 39000000 },
              { code: 'F01S03', name: 'To conduct four (4) KAMAA meetings and facilitate the promotion, recategorization, and confirmation of 57 MIT staff by June 2026', budget: 27500000 },
              { code: 'F01S04', name: 'To manage data cleaning process by June 2026', budget: 6400000 },
              { code: 'F01S05', name: 'To facilitate trade attaches in strategic countries by June 2026', budget: 138000000 },
            ],
          },
          { code: 'F03S', name: 'MIT Staff Welfare promoted and facilitated by June 2026', budget: 3725455000,
            activities: [
              { code: 'F03S01', name: 'To ensure working equipment and facilities are procured and installed by June 2026', budget: 2560847500 },
              { code: 'F03S02', name: 'To facilitate MIT staff to participate in statutory meetings and national ceremonies (two workers\' councils, two staff meetings, Women\'s Day and Workers\' Day) by June 2026', budget: 160850000 },
              { code: 'F03S03', name: 'To facilitate department staff to participate in international meetings and seminars by June 2026', budget: 27200000 },
              { code: 'F03S04', name: 'To facilitate eighty (80) MIT staff to participate in two (2) Bonanza events and the SHIMIWI competition by June 2026', budget: 110500000 },
              { code: 'F03S05', name: 'To facilitate department officials and other operational cadres in performing their routine and other work by June 2026', budget: 733437500 },
              { code: 'F03S06', name: 'To improve MIT registry services and systems by June 2026', budget: 37300000 },
              { code: 'F03S07', name: 'To facilitate staff to attend professional association meetings, seminars, leadership courses, and workshops on various skills by June 2026', budget: 37450000 },
              { code: 'F03S08', name: 'To hold two (2) meetings for ministerial training and foreign employment committees by June 2026', budget: 8500000 },
              { code: 'F03S09', name: 'To monitor administration matters at MIT institutions by June 2026', budget: 21800000 },
              { code: 'F03S10', name: 'To monitor human resource matters at MIT institutions by June 2026', budget: 22200000 },
              { code: 'F03S11', name: 'To prevent and monitor the spread of COVID-19 at MIT and its institutions by June 2026', budget: 5370000 },
            ],
          },
          { code: 'F05S', name: 'Employment Policy Operationalized by June 2026', budget: 114275000,
            activities: [
              { code: 'F05S01', name: 'To conduct a training needs assessment and to review and prepare the MIT training program by June 2026', budget: 27925000 },
              { code: 'F05S02', name: 'To train four (4) staff on long courses, ten (10) staff on short and professional courses, three (3) Admin and HR officers on law and public service manuals, and four (4) staff on retirement courses by June 2026', budget: 61400000 },
              { code: 'F05S03', name: 'To conduct an induction course and in-house training for (80) MIT staff by June 2026', budget: 24950000 },
            ],
          },
          { code: 'F06S', name: 'Performance Management Systems implemented by June 2026', budget: 51000000,
            activities: [
              { code: 'F06S01', name: 'To prepare and install the MIT Client Service Charter by June 2026', budget: 51000000 },
            ],
          },
          { code: 'F08S', name: 'Ministry Leaders activities and matters facilitated by June 2026', budget: 1018220000,
            activities: [
              { code: 'F08S01', name: 'To provide statutory and other fringe benefits to entitled staff by June 2026', budget: 962935000 },
              { code: 'F08S02', name: 'To facilitate two (2) MIT leaders (Minister and Deputy Minister) to visit parliamentary constituencies (Jimboni) by June 2026', budget: 55285000 },
            ],
          },
        ],
      },
    ],
  },

  DPP: {
    subVote: '1003', budget: 2660000000,
    objectives: [
      {
        code: 'F', name: 'Ministry capacity to deliver mandated functions improved',
        targets: [
          { code: 'F02S', name: 'Industry and Trade Parliamentary, Cabinet and Union matters coordinated by June 2026', budget: 224980000,
            activities: [
              { code: 'F02S01', name: 'To facilitate MIT\'s participation in four (4) parliamentary sessions and the preparation of responses to forty (40) parliamentary questions by June 2026', budget: 80320000 },
              { code: 'F02S02', name: 'To facilitate MIT\'s participation in four (4) parliamentary committees and coordinate parliamentary field visits by June 2026', budget: 71420000 },
              { code: 'F02S03', name: 'To facilitate MIT\'s participation in meetings with Zanzibar regarding industry and trade union affairs by June 2026', budget: 73240000 },
            ],
          },
          { code: 'F03S', name: 'Policies and Cabinet Papers prepared, analysed and implemented by June 2026', budget: 206420000,
            activities: [
              { code: 'F03S01', name: 'To review and analyze policies and Cabinet papers from other sectors and provide advice accordingly by June 2026', budget: 96100000 },
              { code: 'F03S02', name: 'To coordinate the development of two (2) new policies and the review of two (2) MIT policies by June 2026', budget: 104320000 },
              { code: 'F03S03', name: 'To prepare the Ministerial Policies implementation report by June 2026', budget: 6000000 },
            ],
          },
          { code: 'F04S', name: 'Strategic plan, Operational Plans and Performance reports prepared and implemented by June 2026', budget: 587410000,
            activities: [
              { code: 'F04S01', name: 'To prepare the MTEF budget framework for the financial year 2026/2027 by June 2026', budget: 112380000 },
              { code: 'F04S02', name: 'To prepare an Action Plan and Cash flow for the financial year 2026/2027 by June 2026', budget: 25620000 },
              { code: 'F04S03', name: 'To prepare the Budget Memorandum (RANDAMA) for the financial year 2026/2027 by June 2026', budget: 105120000 },
              { code: 'F04S04', name: 'To facilitate the preparation of the budget speech for the financial year 2026/2027 by June 2026', budget: 87500000 },
              { code: 'F04S05', name: 'To prepare quarterly, mid-year, and annual MTEF progress reports for the financial year 2025/2026 by June 2026', budget: 49040000 },
              { code: 'F04S06', name: 'To review the MIT Strategic Plan (SP) 2021/22 - 2025/26 by June 2026', budget: 116750000 },
              { code: 'F04S07', name: 'To coordinate risk management processes within the Ministry by June 2026', budget: 31000000 },
              { code: 'F04S09', name: 'To coordinate budget committee meetings and compile monthly OC and DEV expenditure by June 2026', budget: 60000000 },
            ],
          },
          { code: 'F05S', name: 'MIT Research and Innovation Matters Coordinated by June 2026', budget: 117950000,
            activities: [
              { code: 'F05S01', name: 'To develop guidelines on research and innovation matters for the Ministry and conduct a Ministry service delivery survey by June 2026', budget: 59050000 },
              { code: 'F05S02', name: 'To identify research priority areas for the Ministry by June 2026', budget: 58900000 },
            ],
          },
          { code: 'F06S', name: 'Human Resource Development Plan implemented by June 2026', budget: 66835000,
            activities: [
              { code: 'F06S01', name: 'To train sixteen (16) staff members in short courses and two (2) staff members in long courses by June 2026', budget: 66835000 },
            ],
          },
          { code: 'F07S', name: 'DPP Staff Welfare promoted and facilitated by June 2026', budget: 1386245000,
            activities: [
              { code: 'F07S01', name: 'To provide statutory entitlements and hospitality to entitled staff by June 2026', budget: 100240000 },
              { code: 'F07S02', name: 'To procure and conduct routine maintenance and repair of office equipment and appliances by June 2026', budget: 1286005000 },
            ],
          },
          { code: 'F08S', name: 'Resource mobilization for MIT Project conducted and Implemented by June 2026', budget: 70160000,
            activities: [
              { code: 'F08S02', name: 'To facilitate four (4) forums with Development Partners for resource mobilization by June 2026', budget: 39160000 },
              { code: 'F08S03', name: 'To facilitate the preparation of two (2) funding projects by June 2026', budget: 31000000 },
            ],
          },
        ],
      },
    ],
  },

  FAU: {
    subVote: '1002', budget: 473750000,
    objectives: [
      {
        code: 'F', name: 'Ministry capacity to deliver mandated functions improved',
        targets: [
          { code: 'F01C', name: 'Human Resource Development Plan implemented by June 2026', budget: 58600000,
            activities: [
              { code: 'F01C01', name: 'To support 2 finance staffs for long and 4 staffs for short-term training by June 2026', budget: 24600000 },
              { code: 'F01C02', name: 'To facilitate 7 Finance staffs to participate in International and Domestic Professional Conferences, Seminars and workshops by June 2026', budget: 34000000 },
            ],
          },
          { code: 'F01S', name: 'MIT Staff welfare promoted and facilitated by June 2026', budget: 191755000,
            activities: [
              { code: 'F01S01', name: 'To prepare Salary deductions and pay salaries to Ministry staff monthly by June 2026', budget: 70175000 },
              { code: 'F01S02', name: 'To provide statutory allowance and other fringe benefits to entitled staff and Finance Staffs welfare by June 2026', budget: 121580000 },
            ],
          },
          { code: 'F02S', name: 'Financial Management Systems implemented by June 2026', budget: 223395000,
            activities: [
              { code: 'F02S01', name: 'To reply and follow up of external and internal audit queries and management letter by June 2026', budget: 59550000 },
              { code: 'F02S02', name: 'To prepare financial statements by June 2026', budget: 63320000 },
              { code: 'F02S03', name: 'To prepare monthly and quarterly financial reports by June 2026', budget: 46700000 },
              { code: 'F02S04', name: 'To execute daily payments and receipts of Public funds by June 2026', budget: 30575000 },
              { code: 'F02S05', name: 'To create awareness on Finance and public accounting standard to MIT staff and stakeholders by June 2026', budget: 9050000 },
              { code: 'F02S06', name: 'To facilitate Finance staffs to control and make follow up of Public funds disbursement and receipts to MIT\'s Institutions by June 2026', budget: 14200000 },
            ],
          },
        ],
      },
    ],
  },

  DID: {
    subVote: '2001', budget: 1707898750,
    objectives: [
      {
        code: 'C', name: 'Industrial performance improved and sustained',
        targets: [
          { code: 'C01S', name: 'Industrial sector census/research conducted by June 2026', budget: 398950000,
            activities: [
              { code: 'C01S02', name: 'To review and monitor the implementation of strategies, plan, programs, legislations for promoting industrial and sector development by June 2026', budget: 83550000 },
              { code: 'C01S03', name: 'To undertake industrial diagnostic study on priorities sub sectors (Textile, Leather, Cashew nut, Edible Oil etc) by June 2026', budget: 94400000 },
              { code: 'C01S04', name: 'To conduct industrial surveys to developing industrial profile and databanks by June 2026', budget: 143600000 },
              { code: 'C01S05', name: 'To conduct research to assess the factors affecting domestic and foreign investor on industries by June 2026', budget: 77400000 },
            ],
          },
          { code: 'C02S', name: 'Quality and productivity through KAIZEN in Tanzania improved by June 2026', budget: 41600000,
            activities: [
              { code: 'C02S01', name: 'To strengthening enterprises through quality and productivity improvements KAIZEN by June 2026', budget: 41600000 },
            ],
          },
          { code: 'C03S', name: 'Industrial Sector Infrastructure developed by June 2026', budget: 204584250,
            activities: [
              { code: 'C03S01', name: 'To conduct Program for Country Partnership (PCP) to facilitate planning strategy by June 2026', budget: 88600000 },
              { code: 'C03S02', name: 'To coordinate and promote development of heavy engineering and machines tools industry by June 2026', budget: 69300000 },
              { code: 'C03S03', name: 'To facilitate Establishment of Tanzania Industrial Master Plan by June 2026', budget: 46684250 },
            ],
          },
          { code: 'C05S', name: 'Industrial Policies and Strategies implemented by June 2026', budget: 217375000,
            activities: [
              { code: 'C05S07', name: 'To finalize National Industrial Policy and Its Strategy by June 2026', budget: 20175000 },
              { code: 'C05S08', name: 'To facilitate and promote development of heavy industries and light industries by June 2026', budget: 91800000 },
              { code: 'C05S09', name: 'To Review Leather Development Strategy and develop Edible Oil strategy by June 2026', budget: 105400000 },
            ],
          },
          { code: 'C06S', name: 'Industrial consultative platforms strengthened by June 2026', budget: 71335000,
            activities: [
              { code: 'C06S01', name: 'To facilitate department staff participate in regional and international meetings (EAC/SADC/TRIPARTITE and AfCTA) meetings by June 2026', budget: 19400000 },
              { code: 'C06S02', name: 'To facilitate participation in UNIDO conferences (General conference, CAMI, Industrial Development Board, etc) by June 2026', budget: 24350000 },
              { code: 'C06S03', name: 'To facilitate implementation of EAC and SADC Industrialization, Textile, Leather, Fruit and Vegetable, Pharmaceutical and Automotives Strategies by June 2026', budget: 14680000 },
              { code: 'C06S04', name: 'To conduct sub-sectoral consultative forum with private sector in matters related to sustainable production of light and heavy industries by June 2026', budget: 12905000 },
            ],
          },
          { code: 'C07S', name: 'Technology transfer and innovation in R&D institution facilitated by June 2026', budget: 207700000,
            activities: [
              { code: 'C07S01', name: 'To facilitate R&D institutions to support and promote technology transfer and innovation for development of heavy and light industries by June 2026', budget: 71800000 },
              { code: 'C07S02', name: 'To coordinate industrial research activities related to industries development to Local Government Authority by June 2026', budget: 121600000 },
              { code: 'C07S03', name: 'To facilitate and coordinate the implementation of TEMDO, NDC, CAMARTEC, TIRDO projects by June 2026', budget: 14300000 },
            ],
          },
          { code: 'C08S', name: 'Program to promote value addition in light manufacturing industries established and implemented by June 2026', budget: 399556000,
            activities: [
              { code: 'C08S01', name: 'To undertake industrial visits and sectoral stakeholders meetings by June 2026', budget: 179500000 },
              { code: 'C08S02', name: 'To monitor and evaluate the performance of light and heavy industries by June 2026', budget: 65200000 },
              { code: 'C08S03', name: 'To commemorate Africa Industrialization Day (AID), National Industrial exhibition and SADC Industrialization week by June 2026', budget: 106321000 },
              { code: 'C08S04', name: 'To conduct industrial intelligence and value chain analysis for local and export products and services by June 2026', budget: 25435000 },
              { code: 'C08S05', name: 'To conduct industrial intelligence and value chain analysis (second activity) by June 2026', budget: 23100000 },
            ],
          },
        ],
      },
      {
        code: 'F', name: 'Ministry capacity to deliver mandated functions improved',
        targets: [
          { code: 'F01C', name: 'Human Resources development plan implemented by June 2026', budget: 28000000,
            activities: [
              { code: 'F01C01', name: 'To facilitate short and long term course for six (6) members of staff by June 2026', budget: 28000000 },
            ],
          },
          { code: 'F01S', name: 'MIT Staff Welfare promoted and facilitated by June 2026', budget: 108518500,
            activities: [
              { code: 'F01S01', name: 'To provide statutory allowances, leave travel and other fringe benefits to entitled officers by June 2026', budget: 108518500 },
            ],
          },
          { code: 'F02S', name: 'Working Facilities Provided by June 2026', budget: 30280000,
            activities: [
              { code: 'F02S01', name: 'To extend hospitality and staff welfare by June 2026', budget: 10000000 },
              { code: 'F02S02', name: 'To ensure efficient running of departmental offices by June 2026', budget: 20280000 },
            ],
          },
        ],
      },
    ],
  },

  PMU: {
    subVote: '1008', budget: 453619250,
    objectives: [
      {
        code: 'F', name: 'Ministry capacity to deliver mandated functions improved',
        targets: [
          { code: 'F01C', name: 'Human Resource Development Plan implemented by June 2026', budget: 73270000,
            activities: [
              { code: 'F01C01', name: 'To train six (6) PMU staff, seven (7) Tender Board Members and User Departments on Procurement Act and its regulations, e-Procurement (NeST) and Contact Management by June 2026', budget: 73270000 },
            ],
          },
          { code: 'F01S', name: 'Ministerial procurement service provided by June 2026', budget: 262269250,
            activities: [
              { code: 'F01S03', name: 'To prepare Annual Procurement Plan and advertise the General Procurement Notice by June 2026', budget: 34750000 },
              { code: 'F01S04', name: 'To conduct four (4) Tender board meetings and five (5) Evaluation meetings by June 2026', budget: 37700000 },
              { code: 'F01S05', name: 'To conduct Annual Stocktaking by June 2026', budget: 25750000 },
              { code: 'F01S06', name: 'To procure working equipment and regular office supplies by June 2026', budget: 125779250 },
              { code: 'F01S07', name: 'To conduct physical verification, codification and disposal of Ministry\'s asset by June 2026', budget: 38290000 },
            ],
          },
          { code: 'F02S', name: 'Working Facilities Provided by June 2026', budget: 118080000,
            activities: [
              { code: 'F02S01', name: 'To provide statutory allowance and staff welfare by June 2026', budget: 118080000 },
            ],
          },
        ],
      },
    ],
  },

  LSU: {
    subVote: '1006', budget: 465307000,
    objectives: [
      {
        code: 'F', name: 'Ministry capacity to deliver mandated functions improved',
        targets: [
          { code: 'F01C', name: 'Human Resources Development programmes plan implemented by June 2026', budget: 20557000,
            activities: [
              { code: 'F01C02', name: 'To facilitate One (01) staff to attend long course and One (01) staff to attend short course by June 2026', budget: 20557000 },
            ],
          },
          { code: 'F03S', name: 'MIT staff welfare promoted and facilitated by June 2026', budget: 183730000,
            activities: [
              { code: 'F03S02', name: 'To provide statutory entitlements and hospitality to Legal Unit\'s Staff by June 2026', budget: 78580000 },
              { code: 'F03S03', name: 'To ensure efficient running of Legal Unit by June 2026', budget: 105150000 },
            ],
          },
          { code: 'F04S', name: 'Legal Services provided by June 2026', budget: 261020000,
            activities: [
              { code: 'F04S06', name: 'To negotiate Trade related contracts in regional and multilateral levels by June 2026', budget: 77140000 },
              { code: 'F04S07', name: 'To draft 15 Industrial and Trade service contracts by June 2026', budget: 45800000 },
              { code: 'F04S08', name: 'To review Five (05) Trade related laws by June 2026', budget: 57380000 },
              { code: 'F04S09', name: 'To represent the Ministry in litigation, Disciplinary cases and in prosecution by June 2026', budget: 50400000 },
              { code: 'F04S10', name: 'To translate into Swahili Language Six (06) Industry and Trade related laws by June 2026', budget: 30300000 },
            ],
          },
        ],
      },
    ],
  },

  ICTU: {
    subVote: '1007', budget: 492500000,
    objectives: [
      {
        code: 'F', name: 'Ministry capacity to deliver mandated functions improved',
        targets: [
          { code: 'F01C', name: 'Human Resources Development Plan implemented by June 2026', budget: 68497000,
            activities: [
              { code: 'F01C01', name: 'To participate in/attend ICT professional meetings, conferences, workshops, and other seminars by June 2026', budget: 19500000 },
              { code: 'F01C02', name: 'To facilitate ICT Unit staff to undertake long term course and short term courses by June 2026', budget: 19997000 },
              { code: 'F01C03', name: 'To conduct ICT awareness training and capacity building on MIT staff by June 2026', budget: 29000000 },
            ],
          },
          { code: 'F01S', name: 'MIT Staff Welfare promoted and facilitated by June 2026', budget: 76703000,
            activities: [
              { code: 'F01S01', name: 'To provide statutory allowance and other fringe benefits to entitled staff and extend hospitality and staff welfare by June 2026', budget: 76703000 },
            ],
          },
          { code: 'F02S', name: 'ICT services delivered by June 2026', budget: 347300000,
            activities: [
              { code: 'F02S01', name: 'To strengthen LAN, Internet, email, and computer systems by June 2026', budget: null },
              { code: 'F02S02', name: 'To develop and maintain industrial databases and the MIT data warehouse by June 2026', budget: 94000000 },
              { code: 'F02S03', name: 'To facilitate and oversee ICT governance and policy framework by 2026', budget: 45150000 },
              { code: 'F02S04', name: 'To maintain ICT infrastructure and equipment by June 2026', budget: 27220000 },
            ],
          },
        ],
      },
    ],
  },

  GCU: {
    subVote: '1004', budget: 480000000,
    objectives: [
      {
        code: 'F', name: 'Ministry capacity to deliver mandated functions improved',
        targets: [
          { code: 'F01C', name: 'Human Resource development Plan implemented by June 2026', budget: 147735000,
            activities: [
              { code: 'F01C01', name: 'To train one (1) communication officer in a long-term course and two (2) short-term courses by June 2026', budget: 17025000 },
              { code: 'F01C02', name: 'To attend local and international professional meetings, seminars, and workshops by June 2026', budget: 130710000 },
            ],
          },
          { code: 'F02S', name: 'Industry and Trade Communication Strategy Developed and Implemented by June 2026', budget: 278645000,
            activities: [
              { code: 'F02S01', name: 'To produce, disseminate, sensitize, and advocate MIT activities and programs by June 2026', budget: 176800000 },
              { code: 'F02S02', name: 'To ensure the efficient functioning of GCU and library services by June 2026', budget: 101845000 },
            ],
          },
          { code: 'F03S', name: 'MIT staff welfare promoted and facilitated by June 2026', budget: 53620000,
            activities: [
              { code: 'F03S01', name: 'To extend hospitality and facilitate staff welfare by June 2026', budget: 34690000 },
              { code: 'F03S02', name: 'To provide statutory allowances to entitled staff by June 2026', budget: 18930000 },
            ],
          },
        ],
      },
    ],
  },

  IAU: {
    subVote: '1005', budget: 455000000,
    objectives: [
      {
        code: 'F', name: 'Ministry capacity to deliver mandated functions improved',
        targets: [
          { code: 'F01C', name: 'Human Resource development Plan implemented by June 2026', budget: 228400000,
            activities: [
              { code: 'F01C01', name: 'To train two (2) staff, one (1) on short course and one (1) on long course by June 2026', budget: 50000000 },
              { code: 'F01C02', name: 'To facilitate Internal Audit Staff to attend Professional Forums by June 2026', budget: 10800000 },
              { code: 'F01C03', name: 'To provide statutory allowance and other fringe benefits to entitled staff by June 2026', budget: 18080000 },
              { code: 'F01C05', name: 'To extend hospitality and staff welfare by June 2026', budget: 145020000 },
              { code: 'F01C06', name: 'To ensure efficient running of departmental offices by June 2026', budget: 4500000 },
            ],
          },
          { code: 'F01S', name: 'Internal controls and Governance system implemented by June 2026', budget: 111450000,
            activities: [
              { code: 'F01S01', name: 'To conduct one (1) awareness training to Audit Committee members and facilitation of 4 audit committee meetings by June 2026', budget: 81680000 },
              { code: 'F01S02', name: 'To prepare the Internal Audit Annual Plan, review Internal Audit Charter and Audit Committee Charter by June 2026', budget: 3300000 },
              { code: 'F01S03', name: 'To review key audit findings and recommend on appropriate action by June 2026', budget: 3100000 },
              { code: 'F01S04', name: 'To conduct audit, prepare quarterly engagements and submit four (4) consolidated Internal Audit Reports by June 2026', budget: 12200000 },
              { code: 'F01S05', name: 'To prepare the Three Years Risk Based Internal Audit Plan by June 2026', budget: 11170000 },
            ],
          },
          { code: 'F03S', name: 'MIT ISOs, Development Projects and MIT (Departments and Units) audited by June 2026', budget: 115150000,
            activities: [
              { code: 'F03S01', name: 'To identify, evaluate and document sufficient information on audit of Projects (Field work) by June 2026', budget: 24500000 },
              { code: 'F03S02', name: 'To conduct audit to the ISO\'s and Projects under the Ministry by June 2026', budget: 59800000 },
              { code: 'F03S03', name: 'To follow up reported audit finding by June 2026', budget: 18000000 },
              { code: 'F03S04', name: 'To conduct performance audit to the Ministry\'s ISOs by June 2026', budget: 12850000 },
            ],
          },
        ],
      },
    ],
  },

  MEU: {
    subVote: '1009', budget: 473432000,
    objectives: [
      {
        code: 'D', name: 'Business environment improved',
        targets: [
          { code: 'D01S', name: 'Ministerial M&E Framework developed and implemented by June 2026', budget: 80420000,
            activities: [
              { code: 'D01S01', name: 'To prepare and track the implementation of the 2025/26 Annual Evaluation Plan by June 2026', budget: 42120000 },
              { code: 'D01S02', name: 'To facilitate department staff to participate in M&E regional and international meetings, seminars, and workshops by June 2026', budget: 38300000 },
            ],
          },
        ],
      },
      {
        code: 'F', name: 'Ministry capacity to deliver mandated functions improved',
        targets: [
          { code: 'F01C', name: 'M&E Human Resource Development Plan implemented by June 2026', budget: 56300000,
            activities: [
              { code: 'F01C01', name: 'To train four (4) staff in short courses and one (1) staff in long courses by June 2026', budget: 44700000 },
              { code: 'F01C02', name: 'To facilitate M&E staff to participate in the M&E week conference by June 2026', budget: 11600000 },
            ],
          },
          { code: 'F01S', name: 'MIT Staff Welfare promoted and facilitated by June 2026', budget: 55126000,
            activities: [
              { code: 'F01S01', name: 'To provide statutory entitlements, and hospitality to entitled staff by June 2026', budget: 35080000 },
              { code: 'F01S02', name: 'To procure and conduct routine maintenance and repair of office equipment and appliances by June 2026', budget: 20046000 },
            ],
          },
          { code: 'F02S', name: 'Ministerial Statistical database established and utilized by June 2026', budget: 29250000,
            activities: [
              { code: 'F02S01', name: 'To conduct baseline surveys for new indicators of Sustainable Development Goals (SDGs) by June 2026', budget: 15800000 },
              { code: 'F02S02', name: 'To prepare the Statistical Book and update the MIT Statistical Profile annually by June 2026', budget: 13450000 },
            ],
          },
          { code: 'F03S', name: 'Evaluation Effectiveness Assessment by June 2026', budget: 252336000,
            activities: [
              { code: 'F03S01', name: 'To monitor and evaluate the implementation of the Ruling Party Manifesto and Government Directives by June 2026', budget: 17100000 },
              { code: 'F03S02', name: 'To monitor and evaluate the implementation of the policy, the Medium-Term Strategic Plan, annual plans, budget, programs, and projects by June 2026', budget: 97336000 },
              { code: 'F03S03', name: 'To conduct monitoring and verification of Controller and Auditor General (CAG) recommendations on a quarterly basis by June 2026', budget: 31500000 },
              { code: 'F03S04', name: 'To prepare the Ministry\'s Annual Performance Report, Management, Oversight, and Coordination (UUU) Report, and other reports by June 2026', budget: 46000000 },
              { code: 'F03S05', name: 'To conduct quarterly M&E Meetings by June 2026', budget: 35000000 },
              { code: 'F03S06', name: 'To evaluate the implementation of directives by boards of institutions under the Ministry by June 2026', budget: 25400000 },
            ],
          },
        ],
      },
    ],
  },

  DTD: {
    subVote: '4002', budget: 2010260000,
    objectives: [
      {
        code: 'D', name: 'Business environment improved',
        targets: [
          { code: 'D01S', name: 'Business licensing legal and regulatory framework Reviewed and implemented by June 2026', budget: 484100000,
            activities: [
              { code: 'D01S01', name: 'To organise conferences, visitation and meetings for gathering and resolving technical challenges faced by businessmen in the country by June 2026', budget: 300010000 },
              { code: 'D01S02', name: 'To identify, review and improve the business type fee matrix by June 2026', budget: 24040000 },
              { code: 'D01S03', name: 'To promote trade through the use of Digital Marketing by June 2026', budget: 30000000 },
              { code: 'D01S04', name: 'To organise Ministerial Public-Private Sectors Discussion (MPPDs) by 2026', budget: 50050000 },
              { code: 'D01S05', name: 'To conduct inspection of business licenses and promote trade formalization by June 2026', budget: 80000000 },
            ],
          },
          { code: 'D04S', name: 'National Export Strategy Developed and Implemented by June 2026', budget: 25062000,
            activities: [
              { code: 'D04S01', name: 'To monitor and coordinate the implementation of NES by June 2026', budget: 25062000 },
            ],
          },
        ],
      },
      {
        code: 'E', name: 'Trade and market competitiveness enhanced',
        targets: [
          { code: 'E01C', name: 'Market promotion Programme developed and implemented by June 2026', budget: 458373000,
            activities: [
              { code: 'E01C03', name: 'To strengthen and promote formalization of Cross Border Trade by June 2026', budget: 30793000 },
              { code: 'E01C04', name: 'To coordinate the Dar-es-Salaam International trade fair (DITF) by June 2026', budget: 100000000 },
              { code: 'E01C05', name: 'To coordinate the participation of entrepreneurs to promote agricultural and Industrial products in domestic and international markets through exhibition (Nane Nane) by June 2026', budget: 50000000 },
              { code: 'E01C06', name: 'To facilitate participation in International trade fairs and Exhibitions, (Expos), Meetings and trade missions by June 2026', budget: 200000000 },
              { code: 'E01C07', name: 'To promote the use of locally produced goods in the domestic market by diverse group of stakeholders by June 2026', budget: 27590000 },
              { code: 'E01C08', name: 'To conduct market intelligence for agricultural and industrial products by June 2026', budget: 49990000 },
            ],
          },
          { code: 'E01S', name: 'Integrated Market information system upgraded by June 2026', budget: 124680000,
            activities: [
              { code: 'E01S01', name: 'To collect, analyze, archive and disseminate market information of Agricultural and Non-Agricultural commodities by June 2026', budget: 124680000 },
            ],
          },
        ],
      },
      {
        code: 'F', name: 'Ministry capacity to deliver mandated functions improved',
        targets: [
          { code: 'F01C', name: 'Human Resource development Plan implemented by June 2026', budget: 30000000,
            activities: [
              { code: 'F01C01', name: 'To train two (2) staff in long courses and three (3) staff in Short courses by June 2026', budget: 30000000 },
            ],
          },
          { code: 'F01S', name: 'Statutory entitlements and hospitality facilitated by June 2026', budget: 362305000,
            activities: [
              { code: 'F01S01', name: 'To extend hospitality and staff welfare by June 2026', budget: 121725000 },
              { code: 'F01S02', name: 'To provide statutory allowances to entitled staff by June 2026', budget: 140580000 },
              { code: 'F01S03', name: 'To procure office equipment and stationaries by June 2026', budget: 100000000 },
            ],
          },
          { code: 'F03S', name: 'Budget subventions to MIT Institutions provided by June 2026', budget: 525740000,
            activities: [
              { code: 'F03S01', name: 'To provide OC subvention to MIT Institutions by June 2026', budget: 525740000 },
            ],
          },
        ],
      },
    ],
  },

  DSME: {
    subVote: '2002', budget: 1009550000,
    objectives: [
      {
        code: 'C', name: 'Industrial performance improved and sustained',
        targets: [
          { code: 'C04S', name: 'SMEs infrastructure development facilitated by June 2026', budget: 229352000,
            activities: [
              { code: 'C04S01', name: 'To coordinate development of MSMEs industrial clusters by June 2026', budget: 128102000 },
              { code: 'C04S02', name: 'To promote LGAs to allocate and develop land for MSMEs activities by June 2026', budget: 101250000 },
            ],
          },
        ],
      },
      {
        code: 'D', name: 'Business environment improved',
        targets: [
          { code: 'D01C', name: 'SMEs Development Policy reviewed and implemented by June 2026', budget: 125550000,
            activities: [
              { code: 'D01C01', name: 'To finalize the review of SME Development Policy (2003) by June 2026', budget: 125550000 },
            ],
          },
          { code: 'D12S', name: 'Mechanism to enable SMEs access to financial services developed and implemented by June 2026', budget: 79750000,
            activities: [
              { code: 'D12S01', name: 'To create awareness about various Schemes provided loans to SMEs by June 2026', budget: 79750000 },
            ],
          },
          { code: 'D14S', name: 'Framework for SMEs business formalization developed and implemented by June 2026', budget: 176747500,
            activities: [
              { code: 'D14S01', name: 'To promote business formalization of informal enterprises by June 2026', budget: 102997500 },
              { code: 'D14S02', name: 'To assess the performance of SIDO and other Ministry based Institutions in delivering their services for SMEs by June 2026', budget: 73750000 },
            ],
          },
        ],
      },
      {
        code: 'E', name: 'Trade and market competitiveness enhanced',
        targets: [
          { code: 'E01C', name: 'Mechanism for improving SMEs products competitiveness established and implemented by June 2026', budget: 135600000,
            activities: [
              { code: 'E01C01', name: 'To facilitate SMEs to access regional and international market opportunities by June 2026', budget: 135600000 },
            ],
          },
        ],
      },
      {
        code: 'F', name: 'Ministry capacity to deliver mandated functions improved',
        targets: [
          { code: 'F07S', name: 'Human Resource development Plan implemented by June 2026', budget: 60100000,
            activities: [
              { code: 'F07S01', name: 'To train one member of staff in long course and 3 in short courses by June 2026', budget: 22100000 },
              { code: 'F07S02', name: 'To ensure efficient running of departmental offices by June 2026', budget: 38000000 },
            ],
          },
          { code: 'F09S', name: 'Statutory Entitlement and hospitality facilitated by June 2026', budget: 83800500,
            activities: [
              { code: 'F09S01', name: 'To provide statutory requirements to entitled staff by June 2026', budget: 72300500 },
              { code: 'F09S02', name: 'To extend hospitality and staff welfare by June 2026', budget: 11500000 },
            ],
          },
        ],
      },
      {
        code: 'Y', name: 'Multi-Sectoral Nutritional Services Improved',
        targets: [
          { code: 'Y01S', name: 'MSMEs and Food Processors engaged in food fortification increased to 20% by June 2026', budget: 118650000,
            activities: [
              { code: 'Y01S01', name: 'To conduct sensitization meetings to MSMEs and food Industries on the use of technologies for food processing, fortification, preservation and storage by June 2026', budget: 118650000 },
            ],
          },
        ],
      },
    ],
  },

  DTI: {
    subVote: '3001', budget: 1800000000,
    objectives: [
      {
        code: 'D', name: 'Business environment improved',
        targets: [
          { code: 'D01S', name: 'National NTBs Strategy developed and implemented by June 2026', budget: 45410000,
            activities: [
              { code: 'D01S01', name: 'To conduct stockholders meetings on the development of the National NTBs Elimination Strategy by 2026', budget: 22370000 },
              { code: 'D01S02', name: 'To coordinate and conduct stakeholders awareness on the National NTBs Elimination Strategy by 2026', budget: 23040000 },
            ],
          },
        ],
      },
      {
        code: 'E', name: 'Trade and market competitiveness enhanced',
        targets: [
          { code: 'E01S', name: 'Bilateral, Regional and Multilateral Negotiations Concluded by June 2026', budget: 543885000,
            activities: [
              { code: 'E01S01', name: 'To negotiate market access in EAC, AfCTA, TFTA, and SADC by June 2026', budget: 352335000 },
              { code: 'E01S02', name: 'To create stakeholders awareness of market access opportunities (EAC, AfCFTA, TFTA, AGOA, and SADC) by June 2026', budget: 65500000 },
              { code: 'E01S03', name: 'To conduct market surveillance in South Sudan and Somalia (new EAC member) by June 2026', budget: 91750000 },
              { code: 'E01S04', name: 'To participate in negotiations meetings for the finalization of the EAC Tariff Offer reduction for Tripartite-FTA and AfCFTA by June 2026', budget: 34300000 },
            ],
          },
          { code: 'E02S', name: 'Implementation of WTO Agreements by June 2026', budget: 222040000,
            activities: [
              { code: 'E02S01', name: 'To coordinate and participate in TFA, agriculture, trade in service, TBT, and SPS committee meetings by June 2026', budget: 90040000 },
              { code: 'E02S02', name: 'To undertake stakeholders meetings/workshops on WTO Fisheries Agreement Subsidies by June 2026', budget: 132000000 },
            ],
          },
          { code: 'E03S', name: 'National Trade Facilitation committees including NMC for NTBs; TBT; SPS; and NCTF coordinated by June 2026', budget: 193070000,
            activities: [
              { code: 'E03S01', name: 'To participate in four (4) meetings on the elimination of NTBs by June 2026', budget: 36620000 },
              { code: 'E03S02', name: 'To conduct four (4) TBT & SPS National Committee meetings by June 2026', budget: 45500000 },
              { code: 'E03S03', name: 'To participate in two (2) National Common Market meetings by June 2026', budget: 25500000 },
              { code: 'E03S04', name: 'To undertake NTBs surveillance in Northern Corridor by June 2026', budget: 30450000 },
              { code: 'E03S05', name: 'To conduct four (4) TF National Committee meetings by June 2026', budget: 55000000 },
            ],
          },
          { code: 'E04S', name: 'Trade Remedies Act enacted and Implemented by June 2026', budget: 89300000,
            activities: [
              { code: 'E04S01', name: 'To facilitate two (2) meetings to prepare regulations of the Trade Remedies Act by June 2026', budget: 54650000 },
              { code: 'E04S02', name: 'To facilitate four (4) meetings on the creation of awareness of the Trade Remedies Act by June 2026', budget: 34650000 },
            ],
          },
          { code: 'E05S', name: 'Conclusion of Bilateral Trade negotiations by June 2026', budget: 263100000,
            activities: [
              { code: 'E05S01', name: 'To conduct ongoing and outgoing trade missions and business forums in strategic countries by June 2026', budget: 44000000 },
              { code: 'E05S02', name: 'To coordinate and participate in the Joint Trade Committee (JTC) and Joint Permanent Commission (JPC) in strategic countries (China, Turkey, India, and Kenya) by June 2026', budget: 60200000 },
              { code: 'E05S03', name: 'To coordinate a stakeholders meeting to formulate an MoU and trade agreement by June 2026', budget: 32000000 },
              { code: 'E05S04', name: 'To coordinate and participate in AGOA Forums by June 2026', budget: 80400000 },
              { code: 'E05S05', name: 'To coordinate and participate in URT-US commercial dialogues by June 2026', budget: 46500000 },
            ],
          },
          { code: 'E06S', name: 'National Trade Policy of 2003 reviewed and implemented by June 2026', budget: 130200000,
            activities: [
              { code: 'E06S01', name: 'To create stakeholders awareness of NTP 2023 by June 2026', budget: 42400000 },
              { code: 'E06S02', name: 'To establish the Trade Act by June 2026', budget: 45400000 },
              { code: 'E06S03', name: 'To establish and operationalize the National Trade Committee by 2026', budget: 42400000 },
            ],
          },
          { code: 'E07S', name: 'E-Commerce Strategy Developed and Implemented by June 2026', budget: 86572000,
            activities: [
              { code: 'E07S01', name: 'To create awareness and build the capacity of stakeholders on E-Commerce Strategy by June 2026', budget: 31000000 },
              { code: 'E07S02', name: 'To participate in regional and international E-Commerce (Digital) forums by 2026', budget: 55572000 },
            ],
          },
          { code: 'E08S', name: 'Implementation of AfCFTA Strategy by June 2026', budget: 82450000,
            activities: [
              { code: 'E08S01', name: 'To create awareness and build the capacity of stakeholders to trade under AfCFTA by June 2026', budget: 58350000 },
              { code: 'E08S02', name: 'To establish the AfCFTA committee and operationalization by June 2026', budget: 24100000 },
            ],
          },
        ],
      },
      {
        code: 'F', name: 'Ministry capacity to deliver mandated functions improved',
        targets: [
          { code: 'F01C', name: 'Training and Development Programs reviewed by June 2026', budget: 54223000,
            activities: [
              { code: 'F01C01', name: 'To facilitate six (6) DTI staff to attend training, two (2) long-term, one (1) internship, and three (3) DTI staff to attend short-term training by June 2026', budget: 54223000 },
            ],
          },
          { code: 'F03S', name: 'MIT Staff Welfare promoted and facilitated by June 2026', budget: 89750000,
            activities: [
              { code: 'F03S01', name: 'To procure office equipment and stationery by June 2026', budget: 22500000 },
              { code: 'F03S02', name: 'To provide statutory allowances to entitled staff by June 2026', budget: 54750000 },
              { code: 'F03S03', name: 'To extend hospitality and staff welfare by June 2026', budget: 12500000 },
            ],
          },
        ],
      },
    ],
  },
};

// ─── Static fallback dept list ────────────────────────────────────────────────
const STATIC_DEPTS = [
  { id: 'dept-dahrm', code: 'DAHRM', name: 'Department of Administration and Human Resource Management', orderNo: 1, units: [] },
  { id: 'dept-did',   code: 'DID',   name: 'Department of Industrial Development', orderNo: 2, units: [] },
  { id: 'dept-dpp',   code: 'DPP',   name: 'Department of Policy and Planning', orderNo: 3, units: [] },
  { id: 'dept-dtd',   code: 'DTD',   name: 'Department of Trade and Development', orderNo: 4, units: [] },
  { id: 'dept-dsme',  code: 'DSME',  name: 'Department of Small and Medium Enterprises', orderNo: 5, units: [] },
  { id: 'dept-dti',   code: 'DTI',   name: 'Department of Trade Integration', orderNo: 6, units: [] },
  { id: 'dept-fau',   code: 'FAU',   name: 'Finance and Accounting Unit', orderNo: 7, units: [] },
  { id: 'dept-pmu',   code: 'PMU',   name: 'Procurement Management Unit', orderNo: 8, units: [] },
  { id: 'dept-lsu',   code: 'LSU',   name: 'Legal Service Unit', orderNo: 9, units: [] },
  { id: 'dept-ictu',  code: 'ICTU',  name: 'Information Communication and Technology Unit', orderNo: 10, units: [] },
  { id: 'dept-gcu',   code: 'GCU',   name: 'Government Communication Unit', orderNo: 11, units: [] },
  { id: 'dept-iau',   code: 'IAU',   name: 'Internal Audit Unit', orderNo: 12, units: [] },
  { id: 'dept-meu',   code: 'MEU',   name: 'Monitoring and Evaluation Unit', orderNo: 13, units: [] },
];

// ─── Detail panel sub-component ───────────────────────────────────────────────
function DeptDetail({ code, name }) {
  const data = DEPT_DATA[code];
  const [openTargets, setOpenTargets] = useState({});
  if (!data) return <p className="text-gray-400 text-sm py-4 text-center">No activity data available for {code}.</p>;

  const toggle = key => setOpenTargets(t => ({ ...t, [key]: !t[key] }));
  const totalActivities = data.objectives.reduce((s, o) => s + o.targets.reduce((s2, t) => s2 + t.activities.length, 0), 0);

  return (
    <div className="space-y-4">
      {/* Budget summary */}
      <div className="flex flex-wrap gap-4 text-xs bg-gray-50 rounded-lg px-4 py-2.5 border">
        <span className="text-gray-500">Sub Vote: <span className="font-bold text-gray-700">{data.subVote}</span></span>
        <span className="text-gray-500">Total Budget (2025/26): <span className="font-bold text-blue-700">TZS {fmt(data.budget)}</span></span>
        <span className="text-gray-500">Objectives: <span className="font-bold text-gray-700">{data.objectives.length}</span></span>
        <span className="text-gray-500">Activities: <span className="font-bold text-gray-700">{totalActivities}</span></span>
      </div>

      {/* Objectives */}
      {data.objectives.map(obj => (
        <div key={obj.code} className="border rounded-xl overflow-hidden">
          {/* Objective header */}
          <div className="bg-gradient-to-r from-gray-100 to-gray-50 px-4 py-2.5 flex items-center gap-2">
            <span className="text-xs font-bold bg-mit-blue text-white px-2 py-0.5 rounded-full">OBJ {obj.code}</span>
            <span className="text-sm font-semibold text-gray-800">{obj.name}</span>
          </div>

          {/* Targets */}
          <div className="divide-y">
            {obj.targets.map(target => {
              const tKey = `${code}-${target.code}`;
              const isOpen = openTargets[tKey];
              return (
                <div key={target.code}>
                  <button
                    onClick={() => toggle(tKey)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-white hover:bg-gray-50 text-left transition-colors"
                  >
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {isOpen
                        ? <ChevronDownIcon className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        : <ChevronRightIcon className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      }
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-indigo-600 mr-1">{target.code}</span>
                        <span className="text-xs text-gray-700">{target.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-3 text-xs">
                      <span className="text-gray-400 hidden sm:inline">TZS {fmt(target.budget)}</span>
                      <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-[10px]">{target.activities.length} act.</span>
                    </div>
                  </button>

                  {/* Activities */}
                  {isOpen && (
                    <div className="bg-gray-50 border-t divide-y divide-gray-100">
                      {target.activities.map((act, idx) => (
                        <div key={act.code} className="flex items-start gap-3 px-6 py-2.5">
                          <span className="text-[10px] font-mono font-bold text-amber-600 flex-shrink-0 mt-0.5 min-w-[64px]">{act.code}</span>
                          <span className="text-xs text-gray-700 flex-1">{act.name}</span>
                          {act.budget != null && (
                            <span className="text-[10px] text-green-700 font-semibold flex-shrink-0 hidden sm:inline">TZS {fmt(act.budget)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Card in icon grid ────────────────────────────────────────────────────────
function DeptCard({ item, selected, onSelect }) {
  const meta = DEPT_META[item.code] || {};
  const isSelected = selected;
  return (
    <button
      onClick={onSelect}
      title={item.name}
      className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all ${
        isSelected
          ? 'bg-mit-blue/10 border-mit-blue shadow ring-1 ring-mit-blue/30'
          : `${meta.color || 'bg-gray-50 border-gray-200'} hover:shadow-md`
      }`}
    >
      <span className="text-2xl leading-none">{meta.icon || '🏢'}</span>
      <span className={`text-[10px] font-bold tracking-wide ${isSelected ? 'text-mit-blue' : 'text-gray-600'}`}>{item.code}</span>
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MITPage() {
  const { data: apiDepts = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => dataEntryApi.listDepartments().then(r => r.data),
  });

  const allDepts = apiDepts.length > 0 ? apiDepts : STATIC_DEPTS;
  const departments = allDepts.filter(d => DEPT_META[d.code]?.type === 'department');
  const units       = allDepts.filter(d => DEPT_META[d.code]?.type === 'unit');

  const [selected, setSelected] = useState(null);
  const select = (item) => setSelected(s => s?.code === item.code ? null : item);

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-5">
        <img src="/tanzania-emblem.svg" alt="Tanzania Emblem" className="w-16 h-16 object-contain drop-shadow" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ministry of Industry and Trade</h1>
          <p className="text-gray-500 text-sm mt-0.5">Headquarters, Dodoma</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1"><BuildingOffice2Icon className="w-3.5 h-3.5" />{departments.length} Departments</span>
            <span className="flex items-center gap-1"><UserGroupIcon className="w-3.5 h-3.5" />{units.length} Units</span>
          </div>
        </div>
      </div>

      {isLoading && <div className="text-center py-10 text-gray-400 text-sm">Loading…</div>}

      {/* ── Departments icon grid ────────────────────────────────────────── */}
      {departments.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 px-2">Departments</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {departments.map(d => (
              <DeptCard key={d.id} item={d} selected={selected?.code === d.code} onSelect={() => select(d)} />
            ))}
          </div>
        </div>
      )}

      {/* ── Units icon grid ─────────────────────────────────────────────── */}
      {units.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 px-2">Units</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
            {units.map(u => (
              <DeptCard key={u.id} item={u} selected={selected?.code === u.code} onSelect={() => select(u)} />
            ))}
          </div>
        </div>
      )}

      {/* ── Detail panel ────────────────────────────────────────────────── */}
      {selected && (
        <div className="card border-mit-blue/20">
          {/* Panel header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{DEPT_META[selected.code]?.icon || '🏢'}</span>
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{selected.code}</span>
                <h2 className="text-base font-bold text-gray-900 leading-tight">{selected.name}</h2>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl px-1">✕</button>
          </div>
          <DeptDetail code={selected.code} name={selected.name} />
        </div>
      )}

      {!selected && (
        <p className="text-center text-xs text-gray-400">Click any department or unit icon above to view its objectives, targets and activities</p>
      )}
    </div>
  );
}
