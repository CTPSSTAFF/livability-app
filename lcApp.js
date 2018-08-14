/**
 *	Boston Region MPO Livable Communities Data Browser
 *	
 *	Application description:
 *		This application may be used to browse CTPS's database of information on various 
 *		factors associated with the 'livability' of communities.
 *
 *	Last update:
 *		09/2017 -- EKE
 *	
 *	Data sources: 
 *		1) United States Bureau of the Census
 *		2) Massachusetts Office of Geographic Information (MassGIS)
 *		3) Massachusetts Department of Transportation (MassDOT)
 *		4) Boston Region Metropolitan Planning Organization
 *		5) Metropolitan Area Planning Council (MAPC)
 *
 *	This application depends on the following libraries:
 *		1) jQuery -- for DOM navigation
 *		2) d3 -- for map visualization, loading CSV data
 *		3) d3-tip -- for tooltips in d3 visualizations
 *		4) topojson -- for loading topojson data for map visualization
 *		5) Accessible Grid -- for rendering HTML tables that are navigable by screen readers
 *		6) Accessible Tabs -- for navigating HTML tables
 *		7) Simple Sliding Doors -- for navigating HTML tables
 *		8) ctpsutils -- custom library with arrays of towns in MPO region and in MA
 *	
 */

function lcAppInit() {

	var CTPS = {};
	CTPS.lcApp = {};
	CTPS.lcApp.data = {};		// Livability Indicators data store (populated on load within d3.queue)
	CTPS.lcApp.town_text = ''; 	// Cached name of selected town.
	
	//////////////////////////////////////////////////////////////////////////////////////
	//
	//	0)	Constants and definitions needed for map and table
	//
	//////////////////////////////////////////////////////////////////////////////////////
	// Files to be loaded by App
	var jsonData = "data/CTPS_TOWNS_TOPO.json";
	var csvData = "data/CTPS_TOWNS_MAPC_LIVABILITY.csv";
	var MAoutline = "data/MA_STATE_NO_MAPC_TOPO.json";

	CTPS.lcApp.defineAndInit = function() {
		// Array of map themes -- The values here are assigned to the "selected_theme" dropdown as the 
		//						  object's values ($("#selected_theme :selected").val();). They are then 
		//						  used to select and update map and legend themes within 'CTPS.lcApp.mapThemesDict()'.
		//					   -- They are also used for interactivity between the table and the map
		//						  to select and display themes.
		CTPS.lcApp.mapThemes = 	[ 
			"COMMUNITY_TYPE",
			"POP_DENSITY",
			"EMP_DENSITY",
			"ELDERLY_POP_PCT",
			"SIDEWALK_COV_PCT",
			"SIDEWALK_MI",
			"WALK_SHARE_PCT",
			"BIKE_COV_PCT",
			"BIKE_SHARE_PCT",
			"BIKE_TRAIL_MI",
			"BIKE_LANE_MI",
			"AUTOS_PER_HH",
			"VMT_PER_HH",
			"PED_CRASH_RATE", 
			"BIKE_CRASH_RATE"
		];
		CTPS.lcApp.mapThemesDict = {
			"COMMUNITY_TYPE"	: {
				themeName		: 'Community Type',
				themeConstant 	: CTPS.lcApp.THEME_COMM_TYPE,
				paletteDomain 	: [1.5,2.5,3.5],
				paletteRange 	: ["#6B0000","#C66B18","#F7C64A","#FFFF84"],
				legendText 		: ["Inner Core", "Regional Urban Center", "Maturing Suburb", "Developing Suburb"],
				pointerText 	: 'Boston Region Towns by Community Type </br></br> Data from: MAPC',
				mapAltText		: 'Map of Boston Region MPO towns, symbolized by community type',
				legendAltText 	: 'Boston Region Towns by Community Type. Categories are inner core, regional urban center, maturing suburb, developing suburb',
				tabSwitchID 	: '#demog',
				gridRowID		: ''
			},
			"POP_DENSITY" 		: {
				themeName		: 'Population Density',
				themeConstant 	: CTPS.lcApp.THEME_POP_DENSITY,
				paletteDomain 	: [750,2000,5000],
				paletteRange 	: ["#e6e5fe", "#cdcbfe", "#7f7bd0", "#595691"],
				legendText 		: ["< 750 people per sq mi", "750-1999 people per sq mi", "2000-5000 people per sq mi", "> 5000 people per sq mi"],
				pointerText 	: 'Population density (residents per sq mi) </br></br> Data from: regional model estimates, 2009',
				mapAltText		: 'Map of Boston Region MPO towns, symbolized by population density',
				legendAltText 	: 'Population Density. Population per square mile, 2009 estimate. Four categories are people per square mile ranging from less than 750 to more than 5000',
				tabSwitchID 	: '#demog',
				gridRowID		: '#demog_table_r_2'
			},
			"EMP_DENSITY" 		: {
				themeName		: 'Employment Density',
				themeConstant 	: CTPS.lcApp.THEME_EMP_DENSITY,
				paletteDomain 	: [1000,2500,5000],
				paletteRange 	: ["#D6F7AD", "#ADBD7B","#849452", "#636B29"],
				legendText 		: ["< 1000 jobs per sq mi","1000-2499 jobs per sq mi","2500-5000 jobs per sq mi","> 5000 jobs per sq mi"],
				pointerText 	: 'Employment density (jobs per sq mi) </br></br> Data from: regional model estimates, 2009',
				mapAltText		: 'Map of Boston Region MPO towns, symbolized by employment density',
				legendAltText 	: 'Employment Density. Employment per square mile, 2009 estimate. Four categories are jobs per square mile ranging from less than 1000 to more than 5000',
				tabSwitchID 	: '#demog',
				gridRowID		: '#demog_table_r_4'
			},
			"ELDERLY_POP_PCT"	: {
				themeName		: 'Elderly Population Percentage',
				themeConstant 	: CTPS.lcApp.THEME_ELDERLY_POP,
				paletteDomain 	: [5,8,10],
				paletteRange 	: ["#FEF7E7", "#E79484","#BD4A39", "#8C0808"],
				legendText 		: ["< 5%","5-8%","8-10%","> 10%"],
				pointerText 	: 'Percentage of elderly (over 70) population </br></br> Data from: regional model estimates, 2009',
				mapAltText		: 'Map of Boston Region MPO towns, symbolized by elderly population percentage',
				legendAltText 	: 'Percentage of town population over age 70. Four categories range from less than 5 percent to over 10 percent',
				tabSwitchID 	: '#demog',
				gridRowID		: '#demog_table_r_5'
			},
			"SIDEWALK_COV_PCT" 	: {
				themeName		: 'Sidewalk Coverage',
				themeConstant 	: CTPS.lcApp.THEME_SIDEWALK_COV,
				paletteDomain 	: [25,50,75],
				paletteRange 	: ["#f5e1fe", "#eac3fe","#9f65be", "#592277"],
				legendText 		: ["< 25%","25-50%","50-75%","> 75%"],
				pointerText 	: 'Percentage of non-Interstate roadway miles with sidewalks on at least one side </br></br> Data from: Massachusetts Roadway Inventory 2009',
				mapAltText		: 'Map of Boston Region MPO towns, symbolized by sidewalk coverage',
				legendAltText 	: 'Percentage of non-Interstate roadway miles with sidewalks on at least one side. Four categories range from less than 25% to over 75%',
				tabSwitchID 	: '#walk',
				gridRowID		: '#walk_table_r_2'
			},
			"SIDEWALK_MI" 		: {
				themeName		: 'Miles of Sidewalk',
				themeConstant 	: CTPS.lcApp.THEME_SIDEWALK_MI,
				paletteDomain 	: [50,100,200],
				paletteRange 	: ["#FFFF84","#F7C64A","#C66B18","#6B0000"],
				legendText 		: ["< 50 miles","50-99 miles","100-200 miles","> 200 miles"],
				pointerText 	: 'Miles of non-Interstate roadway with sidewalks on at least one side </br></br> Data from: Massachusetts Roadway Inventory 2009',
				mapAltText		: 'Map of Boston Region MPO towns, symbolized by sidewalk mileage',
				legendAltText 	: 'Non-Interstate roadway miles with sidewalks on at least one side. Four categories range from less than 50 miles to over 200 miles.',
				tabSwitchID 	: '#walk',
				gridRowID		: '#walk_table_r_1'
			},
			"WALK_SHARE_PCT" : {
				themeName		: 'Resident Walk Share',
				themeConstant 	: CTPS.lcApp.THEME_WALK_SHARE,
				paletteDomain 	: [5,10,20],
				paletteRange 	: ["#FFE7E7","#E79484","#BD4A39","#8C0808"],
				legendText 		: ["< 5%","5-10%","10-20%","> 20%"],
				pointerText 	: 'Percentage of resident workers who walk to work </br></br> Data from: 2000 Census Journey-to-Work',
				mapAltText		: 'Map of Boston Region MPO towns, symbolized by Census Journey to Work walk share',
				legendAltText 	: 'Census Journey to Work percent walk share. Percentage of workers who live and work in the community and walk to work. Four categories are percentage values up to and over 20 %',
				tabSwitchID 	: '#walk',
				gridRowID		: '#walk_table_r_3'
			},
			"BIKE_COV_PCT" : {
				themeName		: 'Bike Coverage',
				themeConstant 	: CTPS.lcApp.THEME_BIKE_COV,
				paletteDomain 	: [2,4,8],
				paletteRange 	: ["#DEF7EF","#8CB5AD","#4A7B73","#104A4A"],
				legendText 		: ["< 2%","2-4%","4-8%","> 8%"],
				pointerText 	: 'Percent of non-Interstate roadway miles with bike lanes or shoulders &gt 4 feet wide </br></br> Data from: Massachusetts Roadway Inventory 2009',
				mapAltText		: 'Map of Boston Region MPO towns, symbolized by bicycle coverage',
				legendAltText 	: 'Percent of non-Interstate roadway miles with bike lanes or shoulders over 4 feet wide. Four categories are percentage values up to and over 8 %',
				tabSwitchID 	: '#bike',
				gridRowID		: '#bike_table_r_3'
			},
			"BIKE_SHARE_PCT" : {
				themeName		: 'Resident Bike Share',
				themeConstant 	: CTPS.lcApp.THEME_BIKE_SHARE,
				paletteDomain 	: [0.5,1,2],
				paletteRange 	: ["#d7f3fe","#b0e7fe","#52afd6","#397a95"],
				legendText 		: ["< 0.5%","0.5-1%","1-2%","> 2%"],
				pointerText 	: 'Percentage of resident workers who bike to work </br></br> Data from: 2000 Census Journey-to-Work',
				mapAltText		: 'Map of Boston Region MPO towns, symbolized by Census Journey to Work bike share',
				legendAltText 	: 'Census Journey to Work bike share. Percent of workers who live and work in the community and bike to work. Four categories are percentages of work trips up to and over 2 %',
				tabSwitchID 	: '#bike',
				gridRowID		: '#bike_table_r_4'
			},
			"BIKE_TRAIL_MI" : {
				themeName		: 'Miles of Bicycle Trails',
				themeConstant 	: CTPS.lcApp.THEME_BIKE_TRAIL_MI,
				paletteDomain 	: [2.5,5,10],
				paletteRange 	: ["#EFEFCE","#D6EF8C","#BDDE52","#9CC310"],
				legendText 		: ["< 2.5 miles","2.5-5 miles","5-10 miles","> 10 miles"],
				pointerText 	: 'Miles of off-road trails, paved and unpaved </br></br> Data from: CTPS bicycle inventory data',
				mapAltText		: 'Map of Boston Region MPO towns, symbolized by bike trail mileage',
				legendAltText 	: 'Miles of off-road bike trails, paved and unpaved. Four categories are mileage totals up to and over 10 miles',
				tabSwitchID 	: '#bike',
				gridRowID		: '#bike_table_r_1'
			},
			"BIKE_LANE_MI" : {
				themeName		: 'Miles of Bicycle Lanes',
				themeConstant 	: CTPS.lcApp.THEME_BIKE_LANE_MI,
				paletteDomain 	: [1,2.5,10],
				paletteRange 	: ["#FFD6F7","#DE8CAD","#B5526B","#8C1039"],
				legendText 		: ["< 2.5 miles","2.5-5 miles","5-10 miles","> 10 miles"],
				pointerText 	: 'Miles of non-Interstate roadways with bike lanes or shoulders &gt 4 feet wide </br></br> Data from: Massachusetts Roadway Inventory 2009',
				mapAltText		: 'Map of Boston Region MPO towns, symbolized by bike lane mileage',
				legendAltText 	: 'Miles of non-Interstate roadways with bike lanes or shoulders over 4 feet wide. Four categories are mileage totals up to and over 10 miles',
				tabSwitchID 	: '#bike',
				gridRowID		: '#bike_table_r_2'
			},
			"AUTOS_PER_HH" : {
				themeName		: 'Autos per Household',
				themeConstant 	: CTPS.lcApp.THEME_AUTOS_PER_HH,
				paletteDomain 	: [1.5,1.75,2],
				paletteRange 	: ["#d7f3fe","#b0e7fe","#52afd6","#397a95"],
				legendText 		: ["< 1.5 autos","1.5-1.75 autos","1.75-2.0 autos","> 2.0 autos"],
				pointerText 	: 'Average autos per household </br></br> Data from: MAPC',
				mapAltText		: 'Map of Boston Region MPO towns, symbolized by autos per household',
				legendAltText 	: 'Average autos per household. Four categories range from 1.5 to more than 2 autos per household',
				tabSwitchID 	: '#auto',
				gridRowID		: '#auto_table_r_1'
			},
			"VMT_PER_HH" : {
				themeName		: 'Daily VMT per Household',
				themeConstant 	: CTPS.lcApp.THEME_VMT_PER_HH,
				paletteDomain 	: [40,60,80],
				paletteRange 	: ["#FFE7E7","#E79484","#BD4A39","#8C0808"],
				legendText 		: ["< 40 miles","40-60 miles","60-80 miles","> 80 miles"],
				pointerText 	: 'Average daily vehicle miles of travel (VMT) per household, 2005-2007 </br></br> Data from: MassGIS and MAPC',
				mapAltText		: 'Map of Boston Region MPO towns, symbolized by vehicle miles traveled per household',
				legendAltText 	: 'Average daily vehicle miles of travel per household. Four categories range from less than 40 to more than 80 miles',
				tabSwitchID 	: '#auto',
				gridRowID		: '#auto_table_r_2'
			},
			"PED_CRASH_RATE" : {
				themeName		: 'Pedestrian Crash Rate',
				themeConstant 	: CTPS.lcApp.THEME_PED_CRASH,
				paletteDomain 	: [0.1,0.3,0.6],
				paletteRange 	: ["#fee3d7","#fec6b0","#935238","#663927"],
				legendText 		: ["< 0.1","0.1-0.3","0.3-0.6","> 0.6"],
				pointerText 	: 'Number of crashes involving pedestrians per year per 1,000 residents, 1996-2007 </br></br> Data from: Mass. Registry of Motor Vehicles',
				mapAltText		: 'Map of Boston Region MPO towns, symbolized by pedestrian crash rate',
				legendAltText 	: 'Number of crashes involving pedestrians per year per 1000 residents, 1996-2007. Values range from less than 0.1 to greater than 0.6.',
				tabSwitchID 	: '#health',
				gridRowID		: '#phs_table_r_1'
			},
			"BIKE_CRASH_RATE" : {
				themeName		: 'Bicycle Crash Rate',
				themeConstant 	: CTPS.lcApp.THEME_BIKE_CRASH,
				paletteDomain 	: [0.1,0.2,0.5],
				paletteRange 	: ["#FFFF84","#F7C64A","#C66B18","#6B0000"],
				legendText 		: ["< 0.1","0.1-0.2","0.2-0.5","> 0.5"],
				pointerText 	: 'Number of crashes involving bicyclists per year per 1,000 residents, 1996-2007 </br></br> Data from: Mass. Registry of Motor Vehicles',
				mapAltText		: 'Map of Boston Region MPO towns, symbolized by bicycle crash rate',
				legendAltText 	: 'Number of crashes involving bicyclists per year per 1000 residents, 1996-2007. Values range from less than 0.1 to greater than 0.5.',
				legendTitle 	: '',
				tabSwitchID 	: '#health',
				gridRowID		: '#phs_table_r_2'
			}
		};
		
		// "Data stores" for the accessible grids. These are vanilla JS arrays-of-objects.
		CTPS.lcApp.demogStore	= []; 
		CTPS.lcApp.walkStore	= []; 
		CTPS.lcApp.bikeStore	= []; 
		CTPS.lcApp.autoStore	= []; 
		CTPS.lcApp.phsStore		= []; 
		CTPS.lcApp.msStore		= [];

		// The accessible grid objects.
		CTPS.lcApp.demogGrid = {};   
		CTPS.lcApp.walkGrid  = {}; 
		CTPS.lcApp.bikerid   = {}; 
		CTPS.lcApp.autorid   = {}; 
		CTPS.lcApp.phsGrid   = {}; 
		CTPS.lcApp.msGrid    = {};

		// Labels for the rows in the grids.
		CTPS.lcApp.demogRowNames = [
			'Population',
			'Population Density',
			'Employment',
			'Employment Density',
			'Elderly Population Percentage'
		];							
		CTPS.lcApp.walkRowNames = [
			'Miles of Sidewalk',
			'Sidewalk Coverage',
			'Resident Worker Walk Share'
		];
		CTPS.lcApp.bikeRowNames = [
			'Miles of Trails',
			'Miles Bicycle Lanes',
			'Bicycle Coverage',
			'Resident Worker Bicycle Share'
		];						   
		CTPS.lcApp.autoRowNames = [
			'Autos per Household',
			'Daily Vehicle Miles Traveled per Household',
			'Resident Worker Drive-alone Share',
			'Resident Worker Carpool Share'
		];
		CTPS.lcApp.phsRowNames = [
			'Annual Pedestrian Crash Rate',
			'Annual Bicycle Crash Rate'
		];
		CTPS.lcApp.msRowNames = [
			'Drive Alone',
			'Carpool',
			'Transit',
			'Bicycle',
			'Walk',
			'Work at Home',
			'Other'
		];                         
	};	//CTPS.lcApp.defineAndInit()

	// Data structure capturing average stats by MAPC "community type"
	CTPS.lcApp.commTypeStats = [
		// Non-existent 0th community type: placeholder.
		{},
		// Community Type 1: Inner Core
		{	
			'pop_2009'              : 86443,
			'pop_density'           : 9751,
			'emp_2009'              : 56555,
			'emp_density'           : 6380,
			'elderly_pop_pct'       : 9.2,
			'sidewalk_mi'           : 132.5,
			'sidewalk_cov_pct'      : 82.0,
			'walk_share_pct'        : 19.8,
			'bike_trail_mi'         : 2.8,
			'bike_lane_mi'          : 4.5,
			'bike_cov_pct'          : 2.1,
			'bike_share_pct'        : 1.3,
			'autos_per_hh'          : 1.4,
			'vmt_per_hh'            : 40,
			'drove_alone_share_pct' : 52.1,
			'carpool_share_pct'     : 2.9,
			'ped_crash_rate'        : 0.3,
			'bike_crash_rate'       : 0.2,
			'transit_share_pct'		: 27.0,
			'wah_share_pct'			: 7.7,
			'other_share_pct'		: 1.1,
			'housing_costs'         : 0.0, // placeholder
			'transportation_costs'  : 0.0, // placeholder
			'h_plus_t_costs'        : 0.0  // placeholder
		},
		// Community type 2: Regional Urban Center
		{
			'pop_2009'              : 48783,
			'pop_density'           : 3004,
			'emp_2009'              : 27294,
			'emp_density'           : 1681,
			'elderly_pop_pct'       : 10.4,
			'sidewalk_mi'           : 93.4,
			'sidewalk_cov_pct'      : 59.0,
			'walk_share_pct'        : 8.7,
			'bike_trail_mi'         : 0.9,
			'bike_lane_mi'          : 2.0,
			'bike_cov_pct'          : 1.3,
			'bike_share_pct'        : 0.2,
			'autos_per_hh'          : 1.6,
			'vmt_per_hh'            : 47,
			'drove_alone_share_pct' : 70.2,
			'carpool_share_pct'     : 9.9,
			'ped_crash_rate'        : 0.5,
			'bike_crash_rate'       : 0.2,
			'transit_share_pct'		: 2.3,
			'wah_share_pct'			: 7.7,
			'other_share_pct'		: 0.9,
			'housing_costs'         : 0.0, // placeholder
			'transportation_costs'  : 0.0, // placeholder
			'h_plus_t_costs'        : 0.0  // placeholder
		},
		// Community type 3: Maturing Suburb
		{
			'pop_2009'              : 20339,
			'pop_density'           : 1544,
			'emp_2009'              : 10612,
			'emp_density'           : 805,
			'elderly_pop_pct'       : 10.6,
			'sidewalk_mi'           : 41.5,
			'sidewalk_cov_pct'      : 40.0,
			'walk_share_pct'        : 7.7,
			'bike_trail_mi'         : 0.5,
			'bike_lane_mi'          : 1.5,
			'bike_cov_pct'          : 1.5,
			'bike_share_pct'        : 0.2,
			'autos_per_hh'          : 1.9,
			'vmt_per_hh'            : 62,
			'drove_alone_share_pct' : 63.8,
			'carpool_share_pct'     : 6.5,
			'ped_crash_rate'        : 0.3,
			'bike_crash_rate'       : 0.2,
			'transit_share_pct'		: 0.6,
			'wah_share_pct'			: 20.4,
			'other_share_pct'		: 0.7,
			'housing_costs'         : 0.0, // placeholder
			'transportation_costs'  : 0.0, // placeholder
			'h_plus_t_costs'        : 0.0  // placeholder
		},
		// Community Type 4: Developing Suburb
		{
			'pop_2009'              : 10837,
			'pop_density'           : 673,
			'emp_2009'              : 4621,
			'emp_density'           : 287,
			'elderly_pop_pct'       : 7.6,
			'sidewalk_mi'           : 20.7,
			'sidewalk_cov_pct'      : 28.0,
			'walk_share_pct'        : 5.9,
			'bike_trail_mi'         : 0.0,
			'bike_lane_mi'          : 1.6,
			'bike_cov_pct'          : 2.2,
			'bike_share_pct'        : 0.3,
			'autos_per_hh'          : 2.1,
			'vmt_per_hh'            : 76,
			'drove_alone_share_pct' : 63.3,
			'carpool_share_pct'     : 6.7,
			'ped_crash_rate'        : 0.2,
			'bike_crash_rate'       : 0.1,
			'transit_share_pct'		: 0.2,
			'wah_share_pct'			: 22.8,
			'other_share_pct'		: 0.8,
			'housing_costs'         : 0.0,  // placeholder
			'transportation_costs'  : 0.0,  // placeholder
			'h_plus_t_costs'        : 0.0	// placeholder
		}
	]; 			 

	// Data structure capturing average stats by MAPC "regional average"
	CTPS.lcApp.regionStats = {
		'pop_2009'              : 31807,
		'pop_density'           : 2232,
		'emp_2009'              : 17928,
		'emp_density'           : 1287,
		'elderly_pop_pct'       : 9.60,
		'sidewalk_mi'           : 55.40,
		'sidewalk_cov_pct'      : 50.00,
		'walk_share_pct'        : 14.78,
		'bike_trail_mi'         : 3.70,
		'bike_lane_mi'          : 2.0,
		'bike_cov_pct'          : 1.90,
		'bike_share_pct'        : 0.87,
		'autos_per_hh'          : 1.6,
		'vmt_per_hh'            : 47,
		'transit_share_pct'		: 16.19,
		'drove_alone_share_pct' : 48.28,
		'carpool_share_pct'     : 7.85,
		'wah_share_pct'			: 11.05,
		'other_share_pct'		: 0.97,
		'ped_crash_rate'        : 0.4,
		'bike_crash_rate'       : 0.2,
		'housing_costs'         : 17003,
		'transportation_costs'  : 10229,
		'h_plus_t_costs' 	    : 27232
	};

	//////////////////////////////////////////////////////////////////////////////////////
	//
	//	1)	Utility functions available to app
	//
	//////////////////////////////////////////////////////////////////////////////////////
	// To limit this application to only working within the CTPS firewall,
	// change CTPS.lcApp.szServerRoot to '/geoserver'.
	// The test tries to set the variable appropriately by looking at the hostname of the URL in the browser "location" object.
	if (window.location.hostname === 'lindalino') {
		CTPS.lcApp.szServerRoot = '/geoserver'; 
	} else {
		CTPS.lcApp.szServerRoot = '/map'; 
	};
	CTPS.lcApp.szWMSserverRoot = CTPS.lcApp.szServerRoot + '/wms'; 
	CTPS.lcApp.szWFSserverRoot = CTPS.lcApp.szServerRoot + '/wfs';
	
	// Function to open URL in new window -- used for "Help Button"
	function popup(url) {
		popupWindow = window.open(url,'popUpWindow','height=700,width=800,left=10,top=10,resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,directories=no,status=yes')
	}; // popup()

	// hide/unhide toggle, works in conjunction with class definition in CSS file
	function unhide(divID) {
		//function toggles hiding and unhiding a specified Div
		var item = document.getElementById(divID);
		if (item) {
			item.className=(item.className==='hidden')?'unhidden':'hidden';
		};
	}; // unhide()
		
	// Mechanism by which individual classes are added and subtracted to tags when there's more than one class (legacy from MMcS).
	// Used to toggle the hidden/unhidden class for the table grid.
	var CSSClass = {};
	CSSClass.is = function(){
		var e = document.getElementById('mytabs');		
		var classes = e.className;
		if (classes==="hidden") {
			alert('from "is" fcn classes=hidden');
		} else {
			alert('from "is" fcn  classes not equal hidden--classes:' + classes);
		};
	}; // CSSClass.is()

	CSSClass.add = function(){
		var e = document.getElementById('mytabs');
		e.className += ' hidden';
	}; // CSSClass.add()

	CSSClass.remove = function(){
		var e = document.getElementById('mytabs');
		e.className = e.className.replace(/hidden/gi,"");
	} ; // CSSClass.remove()
	
	// Function to capitalize only first letter of Town names
	// https://stackoverflow.com/questions/196972/convert-string-to-title-case-with-javascript/196991#196991
	function toTitleCase(str) {
		return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
	};
	
	// Function to rearrage data array (needed for hover-highlighting b/c internal data order messed up
	// when you bring the selected town to the front of the SVG -- this corrects that bug)
	// https://stackoverflow.com/questions/5306680/move-an-array-element-from-one-array-position-to-another
	Array.prototype.move = function (old_index, new_index) {
		if (new_index >= this.length) {
			var k = new_index - this.length;
			while ((k--) + 1) {
				this.push(undefined);
			}
		}
		this.splice(new_index, 0, this.splice(old_index, 1)[0]);
		return this; // for testing purposes
	};
	
	//////////////////////////////////////////////////////////////////////////////////////
	//
	//	2)	Map and Map Legend Initialization/Rendering Functions -- the function
	//		'CTPS.lcApp.initMap' is where d3.queue is called and the data from the jsons
	//		and csv are loaded and saved to 'CTPS.lcApp.data' for later updates on events
	//
	//////////////////////////////////////////////////////////////////////////////////////
	CTPS.lcApp.initMap = function() {
		// Define projection: Mass State Plane NAD 83 Meters.
		// Standard parallels and rotation (grid origin latitude and longitude) from 
		//     NOAA Manual NOS NGS 5: State Plane Coordinate System of 1983, p. 67.
		// The scale and translation vector were determined empirically.
		var projection = d3.geoConicConformal()
							.parallels([41 + 43 / 60, 42 + 41 / 60])
							.rotate([71 + 30 / 60, -41 ])
							.scale([20000])
							.translate([80,780]);
		var geoPath = d3.geoPath(projection);
		
		//Define tooltip
		var tip = d3.tip()
			.attr('class', 'd3-tip')
			.offset([-5, 0])
			.html(function(d) {
				return "<strong>" + toTitleCase(d.properties.TOWN) + "</strong>";
			});
		  
		//Initialize Map
		var svg = d3.select("#map")				// SVG created for map visualization
			.append("svg")
				.attr("id", "lcMap")
				.attr("width", $("#map").width())
				.attr("height", $("#map").height());
		var clip = svg.append("svg:clipPath")	// Defined clip here because IE11 has a bug that doesn't clip the
			.attr("id", "clip")					// child SVG elements to the parent DIV.
			.append("svg:rect")					// See: https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Clipping_and_masking
				.attr("x", 0)
				.attr("y", 0)
				.attr("width", $("#map").width())
				.attr("height", $("#map").height());
		var state = svg.append("g")				// "g" element defined to display MA State background
			.attr("id", "lcState")
			.attr("clip-path", "url(#clip)");	// Clip applied to "g"
		var mpo = svg.append("g")				// "g" element defined to display MA towns in MAPC
			.attr("id", "lcMPO")
			.call(tip);
		CTPS.lcApp.svgMPO = mpo;				// Saved for later updates in CTPS.lcApp.renderTheme() 
		var scaleBar = svg.append("g")			// "g" element defined to display scale bar
			.attr("id", "distance_scale");
		
		d3.queue()
			.defer(d3.json, jsonData)
			.defer(d3.csv, csvData)
			.defer(d3.json, MAoutline)
			.awaitAll(function(error, results) {
				//Check for errors
				if (error !== null) {
					alert('Failure loading JSON or CSV file.\n' +
						  'Status: ' + error.status + '\n' +
						  'Status text: ' + error.statusText + '\n' +
						  'URL :' + error.responseURL);
					return;
				}
				//No errors, bind data values
				var topotowns = results[0];
				var lcData = results[1];
				var towns = topojson.feature(topotowns, topotowns.objects.CTPS_TOWNS).features;
				for (var i=0; i<towns.length; i++) {
					for (var j=0; j<lcData.length; j++) {
						if (+towns[i].properties.TOWN_ID === +lcData[j].TOWN_ID) {
							towns[i].properties = lcData[j];
						};
					};
				};	// CSV data merged with JSON data to create JSON object with all data for app
				CTPS.lcApp.data = towns;		// Saved for later reference and data calls in CTPS.lcApp.renderTheme()
				
				var topoOutline = results[2];
				CTPS.lcApp.topoOutline = topojson.feature(topoOutline, topoOutline.objects.MA_STATE_NO_MAPC).features;
				
				// Create SVG <path> for towns
				mpo.selectAll("path")
					.data(CTPS.lcApp.data)
					.enter()
					.append("path")
						.attr("id", function(d, i) { return d.properties.TOWN_ID; })
						.attr("class", "towns")
						.attr("d", function(d, i) { return geoPath(d); })
						.style("fill", "#fff")
						.style("stroke", "#000")
						.style("stroke-width", "1px")
						.on("mouseenter", function(d) { 
							tip.show(d); 
							d3.select(this).style("cursor", "pointer")
										   .style("fill-opacity", 0.3);
						})
						.on("mouseleave", function(d) { 
							d3.select(this).style("fill-opacity", 1);
							tip.hide(d);
						})
						.on("click", function(d) {
							$(".towns").each(function(i) {
								this.style.strokeWidth = "1px";
								this.style.stroke = "#000";
							});
							$("#selected_town").val(+d.properties.TOWN_ID);
							CTPS.lcApp.town_text = toTitleCase(d.properties.TOWN);
							d3.select(this.parentNode.appendChild(this))
								.transition().duration(100)
									.style("stroke-width", "4px")
									.style("stroke", "#ff0000");
							for (var i=0; i<CTPS.lcApp.data.length; i++) {
								if (+CTPS.lcApp.data[i].properties.TOWN_ID === +this.id) {
									// Reorder data so selected town moved to last element in array.
									// Needed in order to properly update data, d3 thinks this town
									// was drawn last and will improperly update the map otherwise
									CTPS.lcApp.data.move(i, CTPS.lcApp.data.length-1);
								};
							};
							CTPS.lcApp.getDataForTown(d.properties.TOWN_ID);
						});
				
				// Create SVG <path> for MA State Outline
				state.selectAll("#lcState")
					.data(CTPS.lcApp.topoOutline)
					.enter()
					.append("path")
						.attr("id", "MA_State_Outline")
						.attr("d", function(d, i) { return geoPath(d); })
						.style("fill", "#f0f0f0")
						.style("stroke", "#bdbdbd")
						.style("stroke-width", "0.2px")
						.style("zIndex", 1);
						
				// Create Scale Bar
				// Code from: https://bl.ocks.org/ThomasThoren/6a543c4d804f35a240f9, but also check out:
				// https://stackoverflow.com/questions/44222003/how-to-add-or-create-a-map-scale-bar-to-a-map-created-with-d3-js
				// because maths might be more accurate
				function pixelLength(this_topojson, this_projection, miles) {
					// Calculates the window pixel length for a given map distance.
					// Not sure if math is okay, given arcs, projection distortion, etc.

					var actual_map_bounds = d3.geoBounds(this_topojson);

					var radians = d3.geoDistance(actual_map_bounds[0], actual_map_bounds[1]);
					var earth_radius = 3959;  // miles
					var arc_length = earth_radius * radians;  // s = r * theta

					var projected_map_bounds = [
						this_projection(actual_map_bounds[0]),
						this_projection(actual_map_bounds[1])
					];

					var projected_map_width = projected_map_bounds[1][0] - projected_map_bounds[0][0];
					var projected_map_height = projected_map_bounds[0][1] - projected_map_bounds[1][1];
					var projected_map_hypotenuse = Math.sqrt(
						(Math.pow(projected_map_width, 2)) + (Math.pow(projected_map_height, 2))
					);

					var pixels_per_mile = projected_map_hypotenuse / arc_length;
					var pixel_distance = pixels_per_mile * miles;

					return pixel_distance;
				};
				
				var pixels_10mi = pixelLength(topojson.feature(topotowns, topotowns.objects.CTPS_TOWNS), projection, 10);
				
				scaleBar.append("rect")
					.attr("x", $('#map').width() - 15 - pixels_10mi)
					.attr("y", $('#map').height() - 25)
					.attr("width", pixels_10mi)
					.attr("height", 2.5)
					.style("fill", "#000");
				scaleBar.append('text')
					.attr("x", $('#map').width() - 15 - pixels_10mi)
					.attr("y", $('#map').height() - 8)
					.attr("text-anchor", "start")
					.text("10 miles");

			});
	};	//CTPS.lcApp.initMap()

	CTPS.lcApp.initLegend = function() {
		var legendWidth = 230,
			legendHeight = 120,
			legendRectSize = 16,
			legendSpacing = 4;
		var svgLegend = d3.select("#legend_div")
			.append("svg")
			.attr("id", "lcLegend")
			.attr("width", legendWidth)
			.attr("height", legendHeight);
		var legend = svgLegend.selectAll("#legend_div")
			.data([1,2,3,4])
			.enter()
			.append("g")
				.attr("class", "legend")
				.attr("transform", function(d, i) {
					return "translate(0," + (i * (legendRectSize + legendSpacing) + 8) + ")";
				});
		legend.append("rect")
			.attr("id", "legend_rect")
			.attr("width", legendRectSize)
			.attr("height", legendRectSize)
			.style("fill", "#fff");
		legend.append("text")
			.attr("id", "legend_text")
			.attr("x", legendRectSize + legendSpacing)
			.attr("y", legendRectSize - legendSpacing);
		CTPS.lcApp.legend = legend;
	};	//CTPS.lcApp.initLegend()

	//////////////////////////////////////////////////////////////////////////////////////
	//
	//	3)	Table Initialization/Population/Rendering Functions
	//
	//////////////////////////////////////////////////////////////////////////////////////
	CTPS.lcApp.renderMapAndDataForTown = function() {
		var i;
		var iTownId = +$("#selected_town :selected").val();
		
		if (!iTownId > 0){
			alert('No city or town selected. Please try selecting a theme again from either the dropdown or the map.');
			return;
		} else {
			// We may need to reference this value in the on-click event handler, so save it.
			CTPS.lcApp.iSelectedTown = iTownId;
			
			// Log and save Town Name for Table caption
			for (i = 0; i < CTPSUTILS.aMpoTowns.length; i++) { 
				if (CTPSUTILS.aMpoTowns[i][0] === iTownId) {
					CTPS.lcApp.town_text = toTitleCase(CTPSUTILS.aMpoTowns[i][1]);
					break;
				};
			};
			
			// Fetch and display the "livability" data for the selected town.
			CTPS.lcApp.getDataForTown(iTownId);
			
			// Change highlighted town on map to reflect selected town
			$(".towns").each(function(i) {
				if ( +this.id === +iTownId ) {
					// Outline clicked town in red, bring to front
					d3.select(this.parentNode.appendChild(this))
						.transition().duration(100)
							.style("stroke-width", "4px")
							.style("stroke", "#ff0000");
					for (var i=0; i<CTPS.lcApp.data.length; i++) {
						if (+CTPS.lcApp.data[i].properties.TOWN_ID === +this.id) {
							// Reorder data so selected town moved to last element in array.
							// Needed in order to properly update data, d3 thinks this town
							// was drawn last and will improperly update the map otherwise
							CTPS.lcApp.data.move(i, CTPS.lcApp.data.length-1);
						};
					};
				} else {
					this.style.strokeWidth = "1px";
					this.style.stroke = "#000";
				};
			});
		};
		
	}; // CTPS.lcApp.renderMapAndDataForTown()

	// Function to select and display the "livability" data for the selected town.
	CTPS.lcApp.getDataForTown = function(iTownId) {
		// Update Table
		for (i=0; i<CTPS.lcApp.data.length; i++) {
			if (+(CTPS.lcApp.data[i].properties.TOWN_ID) === +iTownId){
				CTPS.lcApp.displayDataForTown(CTPS.lcApp.data[i].properties);
				break;
			};
		};
		// Re-Highlight selected theme on table
		var iTheme = $("#selected_theme :selected").val();
		if (iTheme.length > 0) {
			$(CTPS.lcApp.mapThemesDict[iTheme].gridRowID).parent().css("font-weight", "bold");
		};
	}; // CTPS.lcApp.getDataForTown()

	// Table Load Function
	CTPS.lcApp.displayDataForTown = function(lcData) {
		//Clear out and initialize grids.
		$('#demog_grid').html('');
		$('#walk_grid').html('');
		$('#bike_grid').html('');
		$('#auto_grid').html('');
		$('#phs_grid').html('');
		$('#ms_grid').html('');
		CTPS.lcApp.initializeGrids();  
		
		// Load the data into the data grid(s) and render them.
		CTPS.lcApp.populateDataStores(lcData); 
		CTPS.lcApp.demogGrid.loadArrayData(CTPS.lcApp.demogStore);    
		CTPS.lcApp.walkGrid.loadArrayData(CTPS.lcApp.walkStore);
		CTPS.lcApp.bikeGrid.loadArrayData(CTPS.lcApp.bikeStore);
		CTPS.lcApp.autoGrid.loadArrayData(CTPS.lcApp.autoStore);
		CTPS.lcApp.phsGrid.loadArrayData(CTPS.lcApp.phsStore);
		CTPS.lcApp.msGrid.loadArrayData(CTPS.lcApp.msStore);
		
		// Add classes to table to link with map themes --> used to make these rows selectable
		for (i=0; i<CTPS.lcApp.mapThemes.length; i++) {
			var row = CTPS.lcApp.mapThemesDict[CTPS.lcApp.mapThemes[i]].gridRowID;
			$(row).addClass(CTPS.lcApp.mapThemes[i]);
			$(row).css("cursor", "pointer");
			$(row).css("text-decoration", "underline");
		};
	
		CSSClass.remove();
		
		if($('#small_sample_warning').hasClass("hidden")){
			unhide('small_sample_warning');
		};
		
	}; // CTPS.lcApp.displayDataForTown()

	// Function to Initialize Table Grids.
	CTPS.lcApp.initializeGrids = function() {

		var colDesc = [ { header : 	'Indicator', 				dataIndex : 'ind' }, 
						{ header : 	'Municipality', 			dataIndex : 'muni' }, 
						{ header : 	'Community Type Average', 	dataIndex : 'commtype' }, 
						{ header : 	'Regional Average', 		dataIndex : 'reg' }
					];
		
		// Create the accessible grids.
		CTPS.lcApp.demogGrid = new AccessibleGrid( { divId 		:	'demog_grid',
													tableId 	:	'demog_table',
													summary		: 	'rows are demographic variables and columns include municipality value, community type average, and regional average',
													caption		:	'Demographic Data for ' + CTPS.lcApp.town_text,
													ariaLive	:	'assertive',
													colDesc		: 	colDesc
										});								
		CTPS.lcApp.demogGrid.loadArrayData(CTPS.lcApp.demogStore);

		CTPS.lcApp.walkGrid = new AccessibleGrid( { divId 		:	'walk_grid',
													tableId 	:	'walk_table',
													summary		: 	'rows include miles of sidewalk and walk share and columns include municipality value, community type average, and regional average',
													caption		:	'Walking Data for ' + CTPS.lcApp.town_text,
													ariaLive	:	'assertive',
													colDesc		: 	colDesc
										});								
		CTPS.lcApp.walkGrid.loadArrayData(CTPS.lcApp.walkStore);

		CTPS.lcApp.bikeGrid = new AccessibleGrid( { divId 		:	'bike_grid',
													tableId 	:	'bike_table',
													summary		: 	'rows include miles of bike trains and bike share and columns include municipality value, community type average, and regional average',
													caption		:	'Bicycling Data for ' + CTPS.lcApp.town_text,
													ariaLive	:	'assertive',
													colDesc		: 	colDesc
										});								
		CTPS.lcApp.bikeGrid.loadArrayData(CTPS.lcApp.bikeStore);
		
		CTPS.lcApp.autoGrid = new AccessibleGrid( { divId 		:	'auto_grid',
													tableId 	:	'auto_table',
													summary		: 	'rows include vehicles per household and walk and carpool shares and columns include municipality value, community type average, and regional average',
													caption		:	'Automotive Data for ' + CTPS.lcApp.town_text,
													ariaLive	:	'assertive',
													colDesc		: 	colDesc
										});								
		CTPS.lcApp.autoGrid.loadArrayData(CTPS.lcApp.autoStore);
		
		CTPS.lcApp.phsGrid = new AccessibleGrid( { 	divId 		:	'phs_grid',
													tableId 	:	'phs_table',
													summary		: 	'rows include pedestrian and bicycle crash rates and columns include municipality value, community type average, and regional average',
													caption		:	'Public Health and Safety Data for ' + CTPS.lcApp.town_text,
													ariaLive	:	'assertive',
													colDesc		: 	colDesc
										});								
		CTPS.lcApp.phsGrid.loadArrayData(CTPS.lcApp.phsStore);
		
		CTPS.lcApp.msGrid = new AccessibleGrid( { 	divId 		:	'ms_grid',
													tableId 	:	'ms_table',
													summary		: 	'Rows are different modes to work and columns include municipality value, community type average, and regional average',
													caption		:	'Journey-to-Work Mode Share Data for ' + CTPS.lcApp.town_text,
													ariaLive	:	'assertive',
													colDesc		: 	colDesc
										});								
		CTPS.lcApp.msGrid.loadArrayData(CTPS.lcApp.msStore);
		
		
	}; // CTPS.lcApp.initializeGrids()

	// Function to load the Table data into the data stores for the ExtJS grids and chart.
	CTPS.lcApp.populateDataStores = function(aAttrs) {
		CTPS.lcApp.lastaAttrs = aAttrs;
		
		var iCommType = +aAttrs.COMMUNITY_TYPE;
		var szAsterisk = "";
		
		// Set  szAsterisk to " *" if SMALL_SAMPLE_SIZE attribute is "Y", i.e., YES.
		if (aAttrs.SMALL_SAMPLE_SIZE === "Y") {
			szAsterisk = " *";
		}
		
		// #1 Demographic data.
		CTPS.lcApp.demogStore = [];
		CTPS.lcApp.demogStore[0] = { 'ind' 		: CTPS.lcApp.demogRowNames[0], 
									 'muni' 	: (+(+aAttrs.POP_2009).toFixed(0)).toLocaleString(),
									 'commtype' : (+CTPS.lcApp.commTypeStats[iCommType].pop_2009).toLocaleString(),
									 'reg'		: (+CTPS.lcApp.regionStats.pop_2009).toLocaleString()
									};
		CTPS.lcApp.demogStore[1] = { 'ind'		: CTPS.lcApp.demogRowNames[1],
									 'muni'		: (+(+aAttrs.POP_DENSITY).toFixed(0)).toLocaleString(),
									 'commtype'	: (+CTPS.lcApp.commTypeStats[iCommType].pop_density).toLocaleString(),
									 'reg'		: (+CTPS.lcApp.regionStats.pop_density).toLocaleString()
									};
		CTPS.lcApp.demogStore[2] = { 'ind'		: CTPS.lcApp.demogRowNames[2],
									 'muni'		: (+(+aAttrs.EMP_2009).toFixed(0)).toLocaleString(),
									 'commtype'	: (+CTPS.lcApp.commTypeStats[iCommType].emp_2009).toLocaleString(),
									 'reg'		: (+CTPS.lcApp.regionStats.emp_2009).toLocaleString()
									};
		CTPS.lcApp.demogStore[3] = { 'ind'		: CTPS.lcApp.demogRowNames[3],
									 'muni'		: (+(+aAttrs.EMP_DENSITY).toFixed(0)).toLocaleString(), 
									 'commtype'	: (+CTPS.lcApp.commTypeStats[iCommType].emp_density).toLocaleString(),
									 'reg'		: (+CTPS.lcApp.regionStats.emp_density).toLocaleString()
									};
		CTPS.lcApp.demogStore[4] = { 'ind'		: CTPS.lcApp.demogRowNames[4],
									 'muni'		: (+(+aAttrs.ELDERLY_POP_PCT).toFixed(1)).toLocaleString() + '%',
									 'commtype'	: (+CTPS.lcApp.commTypeStats[iCommType].elderly_pop_pct).toLocaleString() + '%', 
									 'reg'		: (+CTPS.lcApp.regionStats.elderly_pop_pct).toLocaleString() + '%'
									};								

		// #2 Walk data.
		CTPS.lcApp.walkStore = [];
		CTPS.lcApp.walkStore[0] = {  'ind'		: CTPS.lcApp.walkRowNames[0], 
									 'muni'		: (+(+aAttrs.SIDEWALK_MI).toFixed(1)).toLocaleString(),
									 'commtype'	: (+(+CTPS.lcApp.commTypeStats[iCommType].sidewalk_mi).toFixed(1)).toLocaleString(), 
									 'reg'		: (+(+CTPS.lcApp.regionStats.sidewalk_mi).toFixed(1)).toLocaleString()
									};		
		CTPS.lcApp.walkStore[1] = {  'ind'		: CTPS.lcApp.walkRowNames[1], 
									 'muni'		: (+(+aAttrs.SIDEWALK_COV_PCT).toFixed(1)).toLocaleString() + '%', 
									 'commtype'	: (+(+CTPS.lcApp.commTypeStats[iCommType].sidewalk_cov_pct).toFixed(1)).toLocaleString() + '%', 
									 'reg'		: (+(+CTPS.lcApp.regionStats.sidewalk_cov_pct).toFixed(1)).toLocaleString() + '%'
									};	
		CTPS.lcApp.walkStore[2] = {  'ind'		: CTPS.lcApp.walkRowNames[2],
									 'muni'		: (+(+aAttrs.WALK_SHARE_PCT).toFixed(1)).toLocaleString() + '%' + szAsterisk, 
									 'commtype'	: (+(+CTPS.lcApp.commTypeStats[iCommType].walk_share_pct).toFixed(1)).toLocaleString() + '%', 
									 'reg'		: (+(+CTPS.lcApp.regionStats.walk_share_pct).toFixed(1)).toLocaleString() + '%'
									};	
		
		// #3 Bike data.
		CTPS.lcApp.bikeStore = [];
		CTPS.lcApp.bikeStore[0] = {  'ind'		: CTPS.lcApp.bikeRowNames[0], 
									 'muni'		: (+(+aAttrs.BIKE_TRAIL_MI).toFixed(1)).toLocaleString(),
									 'commtype'	: (+(+CTPS.lcApp.commTypeStats[iCommType].bike_trail_mi).toFixed(1)).toLocaleString(),
									 'reg'		: (+(+CTPS.lcApp.regionStats.bike_trail_mi).toFixed(1)).toLocaleString()
									};							
		CTPS.lcApp.bikeStore[1] = {  'ind'		: CTPS.lcApp.bikeRowNames[1], 
									 'muni'		: (+(+aAttrs.BIKE_LANE_MI).toFixed(1)).toLocaleString(), 
									 'commtype'	: (+(+CTPS.lcApp.commTypeStats[iCommType].bike_lane_mi).toFixed(1)).toLocaleString(), 
									 'reg'		: (+(+CTPS.lcApp.regionStats.bike_lane_mi).toFixed(1)).toLocaleString()
									};	
		CTPS.lcApp.bikeStore[2] = {  'ind'		: CTPS.lcApp.bikeRowNames[2],
									 'muni'		: (+(+aAttrs.BIKE_COV_PCT).toFixed(1)).toLocaleString() + '%', 
									 'commtype'	: (+(+CTPS.lcApp.commTypeStats[iCommType].bike_cov_pct).toFixed(1)).toLocaleString() + '%',
									 'reg'		: (+(+CTPS.lcApp.regionStats.bike_cov_pct).toFixed(1)).toLocaleString() + '%'
									};	
		CTPS.lcApp.bikeStore[3] = {  'ind'		: CTPS.lcApp.bikeRowNames[3],
									 'muni'		: (+(+aAttrs.BIKE_SHARE_PCT).toFixed(1)).toLocaleString() + '%' + szAsterisk, 
									 'commtype'	: (+(+CTPS.lcApp.commTypeStats[iCommType].bike_share_pct).toFixed(1)).toLocaleString() + '%', 
									 'reg'		: (+(+CTPS.lcApp.regionStats.bike_share_pct).toFixed(1)).toLocaleString() + '%'
									};									
			
		// #4 Auto data.
		CTPS.lcApp.autoStore = [];
		CTPS.lcApp.autoStore[0] = {  'ind'		: CTPS.lcApp.autoRowNames[0], 
									 'muni'		: (+(+aAttrs.AUTOS_PER_HH).toFixed(1)).toLocaleString(),
									 'commtype'	: (+(+CTPS.lcApp.commTypeStats[iCommType].autos_per_hh).toFixed(1)).toLocaleString(), 
									 'reg'		: (+(+CTPS.lcApp.regionStats.autos_per_hh).toFixed(1)).toLocaleString()
									};
		CTPS.lcApp.autoStore[1] = {  'ind'		: CTPS.lcApp.autoRowNames[1],
									 'muni'		: (+(+aAttrs.VMT_PER_HH).toFixed(0)).toLocaleString(), 
									 'commtype'	: (+(+CTPS.lcApp.commTypeStats[iCommType].vmt_per_hh).toFixed(0)).toLocaleString(),
									 'reg'		: (+(+CTPS.lcApp.regionStats.vmt_per_hh).toFixed(0)).toLocaleString()
									};
		CTPS.lcApp.autoStore[2] = {  'ind'		: CTPS.lcApp.autoRowNames[2], 
									 'muni'		: (+(+aAttrs.DROVE_ALONE_SHARE_PCT).toFixed(1)).toLocaleString() + '%',
									 'commtype'	: (+(+CTPS.lcApp.commTypeStats[iCommType].drove_alone_share_pct).toFixed(1)).toLocaleString() + '%', 
									 'reg'		: (+(+CTPS.lcApp.regionStats.drove_alone_share_pct).toFixed(1)).toLocaleString() + '%'
									};
		CTPS.lcApp.autoStore[3] = {  'ind'		: CTPS.lcApp.autoRowNames[3], 
									 'muni'		: (+(+aAttrs.CARPOOL_SHARE_PCT).toFixed(1)).toLocaleString() + '%', 
									 'commtype'	: (+(+CTPS.lcApp.commTypeStats[iCommType].carpool_share_pct).toFixed(1)).toLocaleString() + '%', 
									 'reg'		: (+(+CTPS.lcApp.regionStats.carpool_share_pct).toFixed(1)).toLocaleString() + '%'
									};
		
		// #5 Public health and safety data.
		CTPS.lcApp.phsStore = [];
		CTPS.lcApp.phsStore[0] = { 	 'ind'		: CTPS.lcApp.phsRowNames[0], 
									 'muni'		: (+(+aAttrs.PED_CRASH_RATE).toFixed(2)).toLocaleString(), 
									 'commtype'	: (+(+CTPS.lcApp.commTypeStats[iCommType].ped_crash_rate).toFixed(2)).toLocaleString(), 
									 'reg'		: (+(+CTPS.lcApp.regionStats.ped_crash_rate).toFixed(2)).toLocaleString()
									};	
		CTPS.lcApp.phsStore[1] = { 	 'ind'		: CTPS.lcApp.phsRowNames[1], 
									 'muni'		: (+(+aAttrs.BIKE_CRASH_RATE).toFixed(2)).toLocaleString(), 
									 'commtype'	: (+(+CTPS.lcApp.commTypeStats[iCommType].bike_crash_rate).toFixed(2)).toLocaleString(),
									 'reg'		: (+(+CTPS.lcApp.regionStats.bike_crash_rate).toFixed(2)).toLocaleString()
									};

		// #6 Mode split data.  This version is used to read simple table into simple grid.
		CTPS.lcApp.msStore = [];
		CTPS.lcApp.msStore[0] = { 	 'ind'		: CTPS.lcApp.msRowNames[0], 
									 'muni'		: (+(+aAttrs.DROVE_ALONE_SHARE_PCT).toFixed(1)).toLocaleString() + '%', 
									 'commtype'	: (+(+CTPS.lcApp.commTypeStats[iCommType].drove_alone_share_pct).toFixed(1)).toLocaleString() + '%', 
									 'reg'		: (+(+CTPS.lcApp.regionStats.drove_alone_share_pct).toFixed(1)).toLocaleString() + '%'
									};	
		CTPS.lcApp.msStore[1] = { 	 'ind'		: CTPS.lcApp.msRowNames[1], 
									 'muni'		: (+(+aAttrs.CARPOOL_SHARE_PCT).toFixed(1)).toLocaleString() + '%', 
									 'commtype'	: (+(+CTPS.lcApp.commTypeStats[iCommType].carpool_share_pct).toFixed(1)).toLocaleString() + '%',
									 'reg'		: (+(+CTPS.lcApp.regionStats.carpool_share_pct).toFixed(1)).toLocaleString() + '%'
									};
		CTPS.lcApp.msStore[2] = { 	 'ind'		: CTPS.lcApp.msRowNames[2], 
									 'muni'		: (+(+aAttrs.TRANSIT_SHARE_PCT).toFixed(1)).toLocaleString() + '%',  
									 'commtype'	: (+(+CTPS.lcApp.commTypeStats[iCommType].transit_share_pct).toFixed(1)).toLocaleString() + '%', 
									 'reg'		: (+(+CTPS.lcApp.regionStats.transit_share_pct).toFixed(1)).toLocaleString() + '%'
									};
		CTPS.lcApp.msStore[3] = { 	 'ind'		: CTPS.lcApp.msRowNames[3], 
									 'muni'		: (+(+aAttrs.BIKE_SHARE_PCT).toFixed(1)).toLocaleString() + '%', 
									 'commtype'	: (+(+CTPS.lcApp.commTypeStats[iCommType].bike_share_pct).toFixed(1)).toLocaleString() + '%',
									 'reg'		: (+(+CTPS.lcApp.regionStats.bike_share_pct).toFixed(1)).toLocaleString() + '%' 
									};
		CTPS.lcApp.msStore[4] = { 	 'ind'		: CTPS.lcApp.msRowNames[4], 
									 'muni'		: (+(+aAttrs.WALK_SHARE_PCT).toFixed(1)).toLocaleString()+ '%', 
									 'commtype'	: (+(+CTPS.lcApp.commTypeStats[iCommType].walk_share_pct).toFixed(1)).toLocaleString() + '%', 
									 'reg'		: (+(+CTPS.lcApp.regionStats.walk_share_pct).toFixed(1)).toLocaleString()+ '%' 
									};
		CTPS.lcApp.msStore[5] = { 	 'ind'		: CTPS.lcApp.msRowNames[5], 
									 'muni'		: (+(+aAttrs.WAH_SHARE_PCT).toFixed(1)).toLocaleString() + '%',  
									 'commtype'	: (+(+CTPS.lcApp.commTypeStats[iCommType].wah_share_pct).toFixed(1)).toLocaleString() + '%', 
									 'reg'		: (+(+CTPS.lcApp.regionStats.wah_share_pct).toFixed(1)).toLocaleString() + '%' 
									};
		CTPS.lcApp.msStore[6] = { 	 'ind'		: CTPS.lcApp.msRowNames[6], 
									 'muni'		: (+(+aAttrs.OTHER_SHARE_PCT).toFixed(1)).toLocaleString() + '%',
									 'commtype'	: (+(+CTPS.lcApp.commTypeStats[iCommType].other_share_pct).toFixed(1)).toLocaleString() + '%', 
									 'reg'		: (+(+CTPS.lcApp.regionStats.other_share_pct).toFixed(1)).toLocaleString() + '%'
									};

		// This is funky enough to be worth factoring into into a routine of its own......TBD
		
	}; // CTPS.lcApp.populateDataStores()

	//////////////////////////////////////////////////////////////////////////////////////
	//
	//	4)	Map Layer Switcher and Data Loader Functions -- Renders the layer for the
	//		selected map theme and its associated legend.
	//
	//////////////////////////////////////////////////////////////////////////////////////
	CTPS.lcApp.renderTheme = function () {
		var iTheme = $("#selected_theme :selected").val();
		if (CTPS.lcApp.mapThemes.indexOf(iTheme) > -1) {
			// Do Nothing
		} else {
			alert('No theme selected. Please try selecting a theme again from either the dropdown or the table.');
			return;
		};
		
		// Definitions and Functions to load and color selected theme:
		var pathcolor;
		var colorMap = function(iTheme) {
			CTPS.lcApp.svgMPO.selectAll("path")
				.data(CTPS.lcApp.data)
				.transition()
				.duration(1000)
				.ease(d3.easeLinear)
				.style("fill", function(d, i) {
					return pathcolor(d.properties[iTheme]);
				})
				.style("opacity", 0.7);
		};
		var colorLegend = function(legendText){
			var legendData = [0];
			for (i=0; i<pathcolor.domain().length; i++) {
				legendData.push(pathcolor.domain()[i]);
			};
			CTPS.lcApp.legend.select("rect")
				.data(legendData)
				.transition()
				.duration(1000)
				.ease(d3.easeLinear)
				.style("fill", function(d, i) { 
					return pathcolor(d); 
				})
				.style("opacity", "0.7")
				.style("stroke", "#000");
			CTPS.lcApp.legend.select("text")
				.data(legendText)
				.transition()
				.duration(1000)
				.ease(d3.easeLinear)
				.text(function(d, i) { 
					return d; 
				});
		};

		// Set domain and range of palette -- for map and legend
		pathcolor = d3.scaleThreshold()
			.domain(CTPS.lcApp.mapThemesDict[iTheme].paletteDomain)
			.range(CTPS.lcApp.mapThemesDict[iTheme].paletteRange);
		
		// Update Map
		colorMap(iTheme);
		
		// Update the "alt" attribute of the map
		$('#map').attr("alt", CTPS.lcApp.mapThemesDict[iTheme].mapAltText);
		
		// Update Legend
		colorLegend(CTPS.lcApp.mapThemesDict[iTheme].legendText);
		$(".legend_text").text(CTPS.lcApp.mapThemesDict[iTheme].themeName);
		$('#pointer').html(CTPS.lcApp.mapThemesDict[iTheme].pointerText);
		
		// Update the "alt" attribute of the legend
		$('#legend_div').attr("alt", CTPS.lcApp.mapThemesDict[iTheme].legendAltText);
		//document.getElementById('legend_div').innerHTML = CTPS.lcApp.mapThemesDict[iTheme].legendAltText;
		
		// Make the selected data bold in the table
		$('tr').css("font-weight","normal");
		$(CTPS.lcApp.mapThemesDict[iTheme].gridRowID).parent().css("font-weight", "bold");
		
		// If hidden, unhide legend and pointer text:
		if ($('#legend_div').hasClass("hidden")) {
			unhide('legend_div');
		};
		if ($('#pointer').hasClass("hidden")) {
			unhide('pointer');
		};		
		
	}; // CTPS.lcApp.renderTheme()

	//////////////////////////////////////////////////////////////////////////////////////
	//
	//	5)	Data Download Functions
	//
	//////////////////////////////////////////////////////////////////////////////////////
	CTPS.lcApp.initDownloadText = function() {
		
		var szTemp = "http://www.ctps.org";
		szTemp += CTPS.lcApp.szWFSserverRoot + '?';  
		szTemp += "&service=wfs";
		szTemp += "&version=1.0.0";
		szTemp += "&typename=ctpssde:MPODATA.CTPS_TOWNS_MAPC_LIVABILITY";
		szTemp += "&request=getfeature";
		szTemp += "&outputFormat=csv";
		szTemp += "&propertyname=TOWN,TOWN_ID,";
		szTemp += "COMMUNITY_TYPE,PD_GROUP,POP_2009,POP_DENSITY,EMP_2009,EMP_DENSITY,";
		szTemp += "ELDERLY_POP_PCT,SIDEWALK_MI,SIDEWALK_COV_PCT,WALK_SHARE_PCT,";
		szTemp += "BIKE_TRAIL_MI,BIKE_LANE_MI,BIKE_COV_PCT,BIKE_SHARE_PCT,";
		szTemp += "AUTOS_PER_HH,VMT_PER_HH,DROVE_ALONE_SHARE_PCT,CARPOOL_SHARE_PCT,";
		szTemp += "PED_CRASH_RATE,BIKE_CRASH_RATE,TRANSIT_SHARE_PCT,WAH_SHARE_PCT,OTHER_SHARE_PCT,SMALL_SAMPLE_SIZE";

		$('#download_button').each(function() { 
			$(this).click(function() {
				location = $(this).find('a').attr('href');
			});	
		}); // end each() 

		var szUrl = szTemp;	
		var oElement = document.getElementById("downloadAnchorTag");
		oElement.setAttribute("href", szUrl);
	}; // CTPS.lcApp.initDownloadText()

	//////////////////////////////////////////////////////////////////////////////////////
	//
	//	6)	Event Listeners
	//
	//////////////////////////////////////////////////////////////////////////////////////
	CTPS.lcApp.initListeners = function(){
		// 'Display Map Theme' dropdown in 'Left Container'
		$("#selected_theme").change(function(e) {
			var iTheme = $("#selected_theme :selected").val();
			//Change Accessible Table Tab: http://blog.ginader.de/dev/jquery/accessible-tabs/open-tab-from-link-2.html
			if (!iTheme.length > 0){
				alert('No theme selected. Please try selecting a theme again from either the dropdown or the table.');
				return;
			} else {
				$(".tabs").showAccessibleTabSelector(CTPS.lcApp.mapThemesDict[iTheme].tabSwitchID);
			};
			// Render Map and Legend
			CTPS.lcApp.renderTheme();
		});
		
		// 'Get Data Tables' dropdown in 'Right Containter'
		$("#selected_town").change(function(e) {
			CTPS.lcApp.renderMapAndDataForTown();
		});
		
		// 'Button Bank' buttons in 'Right Container'
		$("#download_button").click(function(e) {
			CTPS.lcApp.initDownloadText();
		});
		$("#help_button").click(function(e) {
			popup('lcAppHelp.html');
		});
		
		// Change and render theme on table click
		$(".tabbody").click(function(e) {
			if (e.target.scope === "row") {
				var iTheme = e.target.className;
				if (CTPS.lcApp.mapThemes.indexOf(iTheme) > -1) {
					$("#selected_theme").val(e.target.className);
					CTPS.lcApp.renderTheme();
				} else {
					return;
				};	
			};
		});
	};

	//////////////////////////////////////////////////////////////////////////////////////
	//
	//	7)	Application Initialization Function
	//
	//////////////////////////////////////////////////////////////////////////////////////
	CTPS.lcApp.init = function() {	
		// Define constants and grid params
		var i; 
		CTPS.lcApp.defineAndInit();
		
		// Populate "Select A Municipality" combo box.
		for (i = 0; i < CTPSUTILS.aMpoTowns.length; i++) {
			$("#selected_town").append(
				$("<option />")
					.val(CTPSUTILS.aMpoTowns[i][0])
					.text(toTitleCase(CTPSUTILS.aMpoTowns[i][1]))
			);
		};

		// Populate "Select Map Theme" combo box.
		for (i = 0; i < CTPS.lcApp.mapThemes.length; i++) {
			$("#selected_theme").append(
				$("<option />")
					.val(CTPS.lcApp.mapThemes[i])
					.text(CTPS.lcApp.mapThemesDict[CTPS.lcApp.mapThemes[i]].themeName)
			);
		};
		
		// Initialize Map
		CTPS.lcApp.initMap();
		
		// Initialize Map Legend
		CTPS.lcApp.initLegend();
		
		// Initialize Table
		CTPS.lcApp.initializeGrids();
		
		// Set the "alt" and "title" attributes of the page element containing the map.
		$('#map').attr("alt","Map of Boston Region MPO town boundaries");
		$('#map').attr("title","Map of Boston Region MPO town boundaries");
		
		// Initialize Event Listeners
		CTPS.lcApp.initListeners();

	}; // CTPS.lcApp.init()
	
	// Initialize App!
	CTPS.lcApp.init();
	
};


