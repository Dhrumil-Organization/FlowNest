import React, { useEffect, useState } from 'react';
import { makeStyles } from '@material-ui/styles';
import {
	IconButton,
	useMediaQuery,
	Popper
} from '@material-ui/core';
import { PartySelect } from './Components';
import theme from 'theme';
import {
	GetApiLink,
	getRequestConfig,
} from 'utils/comman';
import axios from 'axios';
import { toLower } from 'lodash';
import HelpIcon from '@material-ui/icons/Help';
import { Autocomplete, createFilterOptions } from '@material-ui/lab';
import CachedIcon from '@material-ui/icons/Cached';

const useStyles = makeStyles(theme => ({
	root: {
		flexGrow: 1,
		padding: theme.spacing(0)
	},

	option: {
		'&[data-focus="true"]': {
			backgroundColor: '#92c6ef',
			color: 'black'
		},
		'&[aria-selected="true"]': {
			backgroundColor: '#2196f3',
			color: 'white'
		}
	},
	card: {
		width: '100%',
		fontSize: 14,
		marginBottom: '1px',
		padding: theme.spacing(0.5, 0.5),
		[theme.breakpoints.down('sm')]: {
			width: '100%',
			flexWrap: 'wrap'
		}
	},
	button: {
		padding: theme.spacing(0.5), //(25px 0px 0px),
		margin: theme.spacing(0.4)
	},
	content: {
		padding: theme.spacing(0, 0.5),
		paddingTop: theme.spacing(0.5),
		flexGrow: 1,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		// overflowWrap: 'anywhere',

		[theme.breakpoints.down('sm')]: {
			width: '100%',
			flexWrap: 'wrap'
		},
		'&:last-child': {
			paddingBottom: theme.spacing(0)
		}
	},
	d1content: {
		padding: theme.spacing(0),
		flexWrap: 'wrap',
		[theme.breakpoints.down('sm')]: {
			width: '100%',
			flexWrap: 'wrap'
		},
		'&:last-child': {
			paddingBottom: theme.spacing(0)
		}
	},
	//
	caption: {
		textAlign: 'right',
		paddingRight: theme.spacing(1),
		fontWeight: 'bold',
		fontSize: 12,
		[theme.breakpoints.down('sm')]: {
			textAlign: 'left',
			paddingRight: theme.spacing(0)
		}
	},
	stats: {
		width: '30%',
		alignSelf: 'auto',
		minHeight: '100%',
		textAlign: 'center',
		padding: theme.spacing(0, 0.5),
		[theme.breakpoints.down('ms')]: {
			flexBasis: '30%',
			alignItems: 'flex-end',
			padding: theme.spacing(0.5)
		},
		[theme.breakpoints.down('xs')]: {
			// flexBasis: '50%',
			alignItems: 'flex-end',
			padding: theme.spacing(0.5)
		},
		'&:last-child': {
			paddingBottom: theme.spacing(0)
		}
	},
	page: {
		flexGrow: 1,
		display: 'flex',
		flexWrap: 'wrap',
		width: '100%',
		padding: theme.spacing(0.5)
	},
	header: {
		padding: theme.spacing(0, 1),
		marginTop: theme.spacing(0),
		marginBottom: theme.spacing(1),
		textAlign: 'center'
	},
	dataheader: {
		fontWeight: '600',
		fontSize: 12
	},
	iconButton: {
		padding: '0'
	},
	selectcmb: {
		height: 25
	},
	input: {
		height: 25
	}
}));
const CustomPopper = function (props) {
	const classes = useStyles();
	return (
		<Popper
			{...props}
			style={{
				marginTop: 25,
				width: '470px',
				border: '1px solid black',
				borderRadius: 5
			}}
		/>
	);
};
const CustomCodePopper = function (props) {
	const classes = useStyles();
	return (
		<Popper
			{...props}
			style={{
				marginTop: 25,
				marginLeft: 40,
				transform: `translate3d(325px 132px 0px)`,
				width: '150px',
				border: '1px solid black',
				borderRadius: 5
			}}
		/>
	);
};
export default function ProductionPartySelect(props) {
	const {
		match,
		history,
		PrpCode,
		YearNo,
		StrCode,
		type,
		FormState,
		setFormState,
		txntype,
		isSexeAllow = 0,
		Isdisabled = 0,
		dependentId = 0,
		onlyFromAutomation = 0,
		setTotalChees,
		setTotalPendingChees,
		newPagePrpTypes,
		onPartyChange = () => { }
	} = props;

	const classes = useStyles();
	const [PartyHelp, setPartyHelpOpen] = useState(false);
	const [PartyList, setPartyList] = useState([]);
	const sm = useMediaQuery(theme.breakpoints.down('sm'));
	const md = useMediaQuery(theme.breakpoints.down('md'));
	const OPTIONS_LIMIT = 20;
	const defaultFilterOptions = createFilterOptions();
	const filterOptions = (options, state) => {
		return defaultFilterOptions(options, state).slice(0, OPTIONS_LIMIT);
	};
	let cancelToken;

	const handleHelpOpen = (helpfor = '') => {
		console.log("helpfor :", helpfor)
		if (toLower(helpfor) === toLower('parcode')) {
			setPartyHelpOpen(true);
		}
	};
	const handleHelpClose = () => {
		setPartyHelpOpen(false);
	};

	const fetchParty = async () => {
		//05-09-2022 Viral Patel
		await axios
			.get(
				`${GetApiLink()}/api/accountdrop`,
				getRequestConfig({
					params: {
						prpcode: PrpCode,
						yearno: YearNo,
						strcode: StrCode,
						acccode: '',
						accname: '',
						partytype: '',
						txntype: txntype,
						type: '',
						grntype: '',
						fetch: '',
						contra: '',
						billdate: '',
						strtype: '',
						isfaint: '',
						sexe: parseInt(isSexeAllow) == 1 ? FormState.values.sexe : ''
					}
				}),
				{ cancelToken: cancelToken.token }
			)
			.then(response => {
				console.log('Party Gets: ', response);
				if (response.data.response.isauth == '_AUTHFAILED') {
					history.push('/auth/logout');
				} else {
					setPartyList(response.data.response.data);
				}

				if (type == 'add') {
					const path = localStorage.getItem('path');
					if (typeof cancelToken != typeof undefined) {
						cancelToken.cancel('Canceling the previous req');
					}
					cancelToken = axios.CancelToken.source();
				}
			})
			.catch(error => {
				console.log('Party Get Error: ', error);
			});
	};

	useEffect(() => {
		if (typeof cancelToken != typeof undefined) {
			cancelToken.cancel('Canceling the previous req');
		}
		cancelToken = axios.CancelToken.source();
		if (Isdisabled == 1) {
			fetchParty();
		}
	}, []);
	const deleteMultipleItemCache = cacheArray => {
		//localStorage.removeItem(cacheArray);
		//alert('Multiple Caches Deleted!');
		if (typeof cancelToken != typeof undefined) {
			cancelToken.cancel('Canceling the previous req');
		}
		cancelToken = axios.CancelToken.source();
		fetchParty();
	};
	function handleOrderEnter(event, search = false) {
		if (event.keyCode == 13) {
			const form = event.target.form;
			if (
				form != null &&
				typeof form != 'undefined' &&
				event.target != '' &&
				typeof event.target != 'undefined' &&
				event.target != null
			) {
				const index = Array.prototype.indexOf.call(form, event.target);
				if (form.elements.length > index + 1) {
					const NextIndex =
						form.elements[index + 1].IconButton ||
							form.elements[index + 1].disabled
							? index + 2
							: index + 1;
					if (form.elements.length > NextIndex) {
						form.elements[NextIndex].focus();
					}
				}
				event.preventDefault();
			}
		}
	}
	const loadPartyData = (event, value) => {
		event.persist();
		if (txntype == 'prod_sample_room_inward') {
			setFormState(FormState => ({
				...FormState,
				values: {
					...FormState.values,
					inwparcode: value.acccode,
					inwparname: value.accname,
					inwpardesc: value.accname,
					parcode: value.acccode,
					parname: value.accname,
					pardesc: value.accname,
					parcity: value.City,
					parstate: value.State,
				}
			}));
		} else if (txntype == 'prod_sample_room_outward') {
			setFormState(FormState => ({
				...FormState,
				values: {
					...FormState.values,
					parcode: value.acccode,
					parname: value.accname,
					pardesc: value.accname,
					paradd: value.Address,
					parcity: value.City,
					parstate: value.State,
					bkrcode: value.bkrcode,
					bkrname: value.bkrname,
					BAccCode: value.bkrcode,
					BAccName: value.bkrname,
				}
			}));
		} else {
			setFormState(FormState => ({
				...FormState,
				values: {
					...FormState.values,
					parcode: value.acccode,
					parname: value.accname,
					pardesc: value.accname,
					paradd: value.Address,
					parcity: value.City,
					parstate: value.State,
					bkrcode: value.hasOwnProperty('bkrcode') ? value.bkrcode : '',
					bkrname: value.hasOwnProperty('bkrname') ? value.bkrname : '',
					BAccCode: value.hasOwnProperty('bkrcode') ? value.bkrcode : '',
					BAccName: value.hasOwnProperty('bkrname') ? value.bkrname : '',
				}
			}));
		}
	};
	const handleFocus = event => event.target.select();
	return (
		<>
			<Autocomplete
				id="combo-box-demo-party-code"
				filterOptions={filterOptions}
				options={PartyList}
				classes={{
					option: classes.option
				}}
				// open={open}
				// onOpen={() => setOpen(true)}
				// onClose={() => setOpen(true)}

				onChange={(event, value) => {
					if (value !== '' && value !== null && typeof value !== 'undefined') {
						loadPartyData(event, value);
					}
				}}
				//autoHighlight
				autoComplete
				style={{ width: 100 }}
				PopperComponent={CustomCodePopper}
				getOptionSelected={(option, value) => option.acccode === value.acccode}
				getOptionLabel={option => option.acccode}
				//onInputChange={handleInputChange}
				renderOption={option => (
					<React.Fragment>
						<span>{option.acccode}</span>
					</React.Fragment>
				)}
				renderInput={params => (
					<div ref={params.InputProps.ref}>
						<input
							type="text"
							{...params.inputProps}
							className={classes.input}
							disabled
							//disabled={type == 'view' || Isdisabled == 1 ? true : false}
							autoComplete="off"
							style={{ width: '100%', float: 'left' }}
							name={'parcode'}
							onFocus={handleFocus}
							onKeyDown={e => {
								handleOrderEnter(e);
							}}
						/>
					</div>
				)}
				value={{
					acccode: `${FormState.values.parcode || ''}`
				}}
			/>
			<IconButton
				className='helpicon'
				onKeyDown={handleOrderEnter}
				style={{ padding: '0px', float: 'left' }}
				disabled={type == 'view' || Isdisabled == 1 ? true : false}
				onClick={e => {
					handleHelpOpen('parcode');
				}}>
				<HelpIcon
					className='helpicon'
					style={{
						padding: '0',
						fontSize: '1.2rem',
						color: type == 'view' || Isdisabled == 1 ? 'darkgrey' : 'darkblue'
					}}
				/>
			</IconButton>
			<Autocomplete
				id="combo-box-demo-party-name"
				filterOptions={filterOptions}
				options={PartyList}
				classes={{
					option: classes.option
				}}
				// open={open}
				// onOpen={() => setOpen(false)}
				// onClose={() => setOpen(true)}
				onKeyDown={handleOrderEnter}
				onChange={(event, value) => {
					loadPartyData(event, value);
				}}
				autoHighlight
				fullWidth={false}
				PopperComponent={CustomPopper}
				getOptionSelected={(option, value) => option.accname === value.accname}
				getOptionLabel={option => option.accname}
				// onInputChange={handleInputChange}
				renderOption={option => (
					<React.Fragment>
						<span>{option.accname}</span>
					</React.Fragment>
				)}
				renderInput={params => (
					<div ref={params.InputProps.ref}>
						<input
							type="text"
							{...params.inputProps}
							className={classes.input}
							autoComplete="off"
							disabled
							//disabled={type == 'view' || Isdisabled == 1 ? true : false}
							style={
								sm
									? { width: '70%', float: 'left' }
									: { width: '71%', float: 'left' }
							}
							name={'parname'}
							onKeyDown={handleOrderEnter}
							onFocus={handleFocus}
						/>
					</div>
				)}
				value={{
					accname: `${FormState.values.parname || ''}`
				}}
			/>
			<IconButton
				onKeyDown={handleOrderEnter}
				tabIndex={-1}
				style={{ padding: '0px', float: 'right' }}
				disabled={type == 'view' || Isdisabled == 1 ? true : false}
				onClick={() => deleteMultipleItemCache(['stateItem'])}>
				<CachedIcon
					style={{
						padding: '0',
						fontSize: '1.2rem'
					}}
				/>
			</IconButton>

			{PartyHelp && (
				<PartySelect
					PartyOpen={PartyHelp}
					handleHelpClose={handleHelpClose}
					FormState={FormState}
					setFormState={setFormState}
					txntype={txntype}
					PrpCode={PrpCode}
					YearNo={YearNo}
					StrCode={StrCode}
					isSexeAllow={isSexeAllow}
					Isdisabled={Isdisabled}
					dependentId={dependentId}
					onlyFromAutomation={onlyFromAutomation}
					setTotalChees={setTotalChees}
					setTotalPendingChees={setTotalPendingChees}
					newPagePrpTypes={newPagePrpTypes}
					onPartyChange={onPartyChange}
				/>
			)}
		</>
	);
}
