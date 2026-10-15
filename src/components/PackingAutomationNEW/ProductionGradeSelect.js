import React, { useEffect, useState } from 'react';
import { makeStyles } from '@material-ui/styles';
import {
	Button, Card, CardContent, Checkbox, CircularProgress, Grid, IconButton, Typography,
	useMediaQuery, TextField, Paper, Popper
} from '@material-ui/core';
import { GradeSelect } from './Components';
import { Alert } from '@material-ui/lab';
import theme from 'theme';
import {
	AddDaysToDate, GetApiLink, getIndex, getmaxsrno, getRequestConfig, getSoBrowse, getToken, setfocus, sumProperty, toProperCase,
	getIsCeo
} from 'utils/comman';
import clsx from 'clsx';
import axios from 'axios';
import { isUndefined, toLower, values } from 'lodash';
import swal from 'sweetalert';
import HelpIcon from '@material-ui/icons/Help';
import { Autocomplete, createFilterOptions } from '@material-ui/lab';
import CachedIcon from '@material-ui/icons/Cached';

const useStyles = makeStyles(theme => ({

	option: {
		'&[data-focus="true"]': { backgroundColor: '#92c6ef', color: 'black' },
		'&[aria-selected="true"]': { backgroundColor: '#2196f3', color: 'white' }
	},
	input: { height: 25 },
	label: { fontSize: 12, fontWeight: 'bold' }
}));

const CustomPopper = function (props) {

	const classes = useStyles();

	return (
		<Popper {...props} style={{ marginTop: 25, width: '470px', border: '1px solid black', borderRadius: 5 }} />
	);
};

const CustomCodePopper = function (props) {

	const classes = useStyles();

	return (
		<Popper {...props} style={{ marginTop: 25, marginLeft: 40, transform: `translate3d(325px 132px 0px)`, width: '150px', border: '1px solid black', borderRadius: 5 }} />
	);
};

export default function ProductionGradeSelect(props) {

	const { setFormState, FormState, type, newPagePrpTypes, newPageStrDesc, txntype, PrpCode, YearNo, StrCode, IsDisabled = 0, IsHelpDisabled = 0, ItmCode = '', MerCode = '', ShdCode = '',
		setD1DetailData = () => { },
		getD1DetailData = []

	} = props;

	const [IsLoading, setIsLoading] = useState(false);
	const classes = useStyles();
	const [GradeHelp, setIGradeHelpOpen] = useState(false);
	const sm = useMediaQuery(theme.breakpoints.down('sm'));
	const md = useMediaQuery(theme.breakpoints.down('md'));
	const [ItemList, setItemList] = useState([]);
	const ItmNameRef = React.useRef();
	const OPTIONS_LIMIT = 20;
	const defaultFilterOptions = createFilterOptions();
	let cancelToken;

	const filterOptions = (options, state) => {

		return defaultFilterOptions(options, state).slice(0, OPTIONS_LIMIT);
	};

	const handleHelpOpen = (helpfor = '') => {

		if (toLower(helpfor) === toLower('grdcode')) {

			setIGradeHelpOpen(true);
		}
	};

	const handleHelpClose = () => {

		setIGradeHelpOpen(false);
	};

	const fetchItem = async (grdcode, itmname) => {

		await axios
			.get(
				`${GetApiLink()}/api/get_criterion`, getRequestConfig(
					{
						params: {
							prpcode: PrpCode,
							yearno: YearNo,
							strcode: StrCode,
							txntype: txntype,
							fetch: 'grd',
							prptype: ''
						}
					}

				), { cancelToken: cancelToken.token }

			).then(response => {

				if (response.data.response.isauth == '_AUTHFAILED') {
				} else {

					setItemList(response.data.response.data);

					if (txntype == 'production_order' && FormState.values.hasOwnProperty('grdcode') && (FormState.values.grdcode == '' || FormState.values.grdcode == null || typeof FormState.values.grdcode == 'undefined')) {

						if (response.data.hasOwnProperty('response') && response.data.response.hasOwnProperty('data') && response.data.response.data && response.data.response.data.length > 0) {

							let tempGrdRow = [];

							response.data.response.data && response.data.response.data.filter((el, ind) => {

								if (el.GrdCode == '1') {

									tempGrdRow[0] = el;
								}
							})

							if (tempGrdRow && tempGrdRow.length > 0) {

								setFormState(FormState => ({
									...FormState,
									values: {
										...FormState.values,
										grdcode: tempGrdRow[0].GrdCode,
										grdname: tempGrdRow[0].GrdName,
									}
								}));
							}
						}
					}
				}

			}).catch(error => { console.log('Grade Get Error: ', error) });
	};

	const fetchMerge = async () => {

		await axios
			.get(
				`${GetApiLink()}/api/get_criterion`, getRequestConfig(
					{
						params: {
							prpcode: PrpCode,
							yearno: YearNo,
							strcode: StrCode,
							txntype: txntype,
							fetch: 'packing_grd',
							productionuid: typeof FormState.values.prcuid === 'undefined' || FormState.values.prcuid == null || FormState.values.prcuid == '' ? '' : FormState.values.prcuid,
							prptype: ''
						}
					}

				), { cancelToken: cancelToken.token }

			).then(response => {

				if (response.data.response.isauth == '_AUTHFAILED') {
				} else {

					setItemList(response.data.response.data);
				}

			}).catch(error => { console.log('Grade Get Error: ', error) });
	};

	useEffect(

		() => {

			if (typeof cancelToken != typeof undefined) {

				cancelToken.cancel('Canceling the previous req');
			}

			cancelToken = axios.CancelToken.source();

			if (IsDisabled == 0) {

				txntype == 'production_packing' ? fetchMerge() : fetchItem('', '')
			}

		}, []
	);

	const deleteMultipleItemCache = cacheArray => {

		localStorage.removeItem(cacheArray);

		if (typeof cancelToken != typeof undefined) {

			cancelToken.cancel('Canceling the previous req');
		}

		cancelToken = axios.CancelToken.source();

		fetchItem('', '');
	};

	let keysPressed = {};

	document.onkeyup = function (event) {

		if (event.keyCode === 113) {

			handleHelpOpen(event.target.name);
		}
	};

	const handleOrderEnter = (event, search = false) => {

		if (event.keyCode === 13) {

			const form = event.target.form;

			if (form !== null
				&& typeof form !== 'undefined'
				&& event.target !== ''
				&& typeof event.target !== 'undefined'
				&& event.target !== null
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

			if (event.target.name === 'grdcode') {

				if (typeof cancelToken != typeof undefined) {

					cancelToken.cancel('Canceling the previous req');
				}

				cancelToken = axios.CancelToken.source();
			}
		}
	}

	const loadItemData = (event, value) => {

		if (value !== '' && value !== null && typeof value !== 'undefined') {

			if (txntype == 'prod_sample_room_inward') {

				setFormState(FormState => ({
					...FormState,
					values: {
						...FormState.values,
						inwgrdcode: value.GrdCode,
						inwgrdname: value.GrdName,
						grdcode: value.GrdCode,
						grdname: value.GrdName
					}
				}));

			} else if ((type == 'add' || type == 'edit') && txntype == 'production_order') {

				if (typeof FormState.values.grdcode != 'undefined' && FormState.values.grdcode != null && FormState.values.grdcode != '' && FormState.values.grdcode != value.GrdCode) {

					let filteredData = [];
					let filteredData1 = [];
					filteredData = getD1DetailData.filter(item => !(parseInt(item.srno) > 0));
					setD1DetailData(filteredData);
					filteredData1 = FormState.values.d1.filter(item => !(parseInt(item.srno) > 0));


					setFormState(FormState => ({
						...FormState,
						values: {
							...FormState.values,
							grdcode: value.GrdCode,
							grdname: value.GrdName,
							d1: filteredData1,
							totqty: 0,
							srno: null
						}
					}));

				} else {

					setFormState(FormState => ({
						...FormState,
						values: {
							...FormState.values,
							grdcode: value.GrdCode,
							grdname: value.GrdName
						}
					}));
				}
			} else {

				setFormState(FormState => ({
					...FormState,
					values: {
						...FormState.values,
						grdcode: value.GrdCode,
						grdname: value.GrdName
					}
				}));
			}
		}
	};

	const handleFocus = event => event.target.select();

	return (
		<>
			<Autocomplete
				id="combo-box-demo-grade-code"
				filterOptions={filterOptions}
				options={ItemList}
				classes={{ option: classes.option }}
				onChange={

					(event, value) => {

						if (value !== '' && value !== null && typeof value !== 'undefined') {

							loadItemData(event, value);
						}
					}
				}
				disabled={type == 'edit' && txntype == 'production_order' ? true : false}
				autoComplete
				style={{ width: 100 }}
				PopperComponent={CustomCodePopper}
				getOptionSelected={(option, value) => option.GrdCode === value.GrdCode}
				getOptionLabel={option => option.GrdCode}
				renderOption={

					option => (

						<React.Fragment><span>{option.GrdCode}</span></React.Fragment>
					)
				}
				renderInput={

					params => (
						<div ref={params.InputProps.ref}>
							<input
								type="text"
								{...params.inputProps}
								className={classes.input}
								disabled={type == 'view' || IsDisabled == 1 || (type == 'edit' && txntype == 'production_order') ? true : false}
								autoComplete="off"
								style={{ width: '100%', float: 'left' }}
								name={'grdcode'}
								onFocus={handleFocus}
								onKeyDown={handleOrderEnter}
							/>
						</div>
					)
				}
				value={{ GrdCode: `${FormState.values.grdcode || ''}` }}
			/>
			<IconButton
				onKeyDown={handleOrderEnter}
				style={{ padding: '0px', float: 'left' }}
				disabled={type == 'view' || IsHelpDisabled == 1 || (type == 'edit' && txntype == 'production_order') ? true : false}
				onClick={e => { handleHelpOpen('grdcode') }}>
				<HelpIcon style={{ padding: '0', fontSize: '1.2rem', color: type == 'view' || IsHelpDisabled == 1 || (type == 'edit' && txntype == 'production_order') ? 'darkgrey' : 'darkblue' }} />
			</IconButton>
			<Autocomplete
				id="combo-box-demo-grade-name"
				filterOptions={filterOptions}
				options={ItemList}
				classes={{ option: classes.option }}
				onKeyDown={handleOrderEnter}
				onChange={(event, value) => { loadItemData(event, value) }}
				autoHighlight
				fullWidth={false}
				PopperComponent={CustomPopper}
				getOptionSelected={(option, value) => option.GrdName === value.GrdName}
				getOptionLabel={option => option.GrdName}
				renderOption={

					option => (
						<React.Fragment> <span>{option.GrdName}</span> </React.Fragment>
					)
				}
				disabled={type == 'edit' && txntype == 'production_order' ? true : false}
				renderInput={

					params => (

						<div ref={params.InputProps.ref}>
							<input
								type="text"
								{...params.inputProps}
								className={classes.input}
								autoComplete="off"
								disabled={type == 'view' || IsDisabled == 1 || (type == 'edit' && txntype == 'production_order') ? true : false}
								style={sm ? { width: '70%', float: 'left' } : { width: '71%', float: 'left' }}
								name={'grdname'}
								onKeyDown={handleOrderEnter}
								onFocus={handleFocus}
							/>
						</div>
					)
				}
				value={{ GrdName: `${FormState.values.grdname || ''}` }}
			/>
			<IconButton
				onKeyDown={handleOrderEnter}
				tabIndex={-1}
				style={{ padding: '0px', float: 'right' }}
				disabled={type == 'view' || IsDisabled == 1 ? true : false}
				onClick={() => deleteMultipleItemCache(['stateItem'])}>
				<CachedIcon style={{ padding: '0', fontSize: '1.2rem' }} />
			</IconButton>

			{
				GradeHelp &&
				(
					<GradeSelect
						GradeOpen={GradeHelp}
						handleHelpClose={handleHelpClose}
						FormState={FormState}
						setFormState={setFormState}
						txntype={txntype}
						PrpCode={PrpCode}
						YearNo={YearNo}
						StrCode={StrCode}
						setD1DetailData={setD1DetailData}
						getD1DetailData={getD1DetailData}
						type={type}
						ItmCode={ItmCode || FormState.values.itmcode}
						MerCode={MerCode || FormState.values.mercode}
						ShdCode={ShdCode || FormState.values.shdcode}
					/>
				)
			}
		</>
	);
}
