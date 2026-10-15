import React, { useEffect, useState } from 'react';
import { makeStyles } from '@material-ui/styles';
import { IconButton, useMediaQuery, Popper } from '@material-ui/core';
import { MergeSelect } from './Components';
import theme from 'theme';
import { GetApiLink, getRequestConfig, } from 'utils/comman';
import axios from 'axios';
import { toLower } from 'lodash';
import HelpIcon from '@material-ui/icons/Help';
import { Autocomplete, createFilterOptions } from '@material-ui/lab';
import CachedIcon from '@material-ui/icons/Cached';
import DeleteForeverRoundedIcon from '@material-ui/icons/DeleteForeverRounded';

const useStyles = makeStyles(theme => ({
	option: {
		'&[data-focus="true"]': { backgroundColor: '#92c6ef', color: 'black' },
		'&[aria-selected="true"]': { backgroundColor: '#2196f3', color: 'white' }
	},
	input: { height: 25 }, label: { fontSize: 12, fontWeight: 'bold' }
}));

const CustomPopper = function (props) {

	const classes = useStyles();

	return (<Popper {...props} style={{ marginTop: 25, width: '470px', border: '1px solid black', borderRadius: 5 }} />);
};

const CustomCodePopper = function (props) {

	const classes = useStyles();

	return (<Popper {...props} style={{ marginTop: 25, marginLeft: 40, transform: `translate3d(325px 132px 0px)`, width: '150px', border: '1px solid black', borderRadius: 5 }} />);
};

export default function ProductionMergeSelect(props) {

	const {
		setFormState, FormState, type, newPagePrpTypes, newPageStrDesc, txntype, PrpCode, YearNo, StrCode,
		IsDisabled = 0, IsHelpDisabled = 1, IsAll = 1, d1srno = '', planninguid = '', planningvouno = '',
		setD2DetailData, getD2DetailData, getItemStrCode = '', getYarnStrCode,
		onlyForProdPackingMod = false, ItmCode = '', GrdCode = '', ShdCode = ''
	} = props;

	console.log("IsDisabled :", IsDisabled);
	console.log("IsHelpDisabled :", IsHelpDisabled);
	console.log("onlyForProdPackingMod : ", onlyForProdPackingMod);
	console.log("txntype :", txntype);
	console.log("FormState --->", FormState)

	const classes = useStyles();
	const [MergeHelp, setIGradeHelpOpen] = useState(false);
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

		if (toLower(helpfor) === toLower('mercode')) {

			setIGradeHelpOpen(true);
		}
	};

	const handleHelpClose = () => setIGradeHelpOpen(false);

	const fetchMerge = async (mercode, mername) => {

		await axios
			.get(
				`${GetApiLink()}/api/mergedrop`, getRequestConfig(
					{
						params: {
							prpcode: PrpCode,
							yearno: YearNo,
							strcode: StrCode,
							MerCode: mercode,
							MerName: mername,
							ItmCode: FormState.values.itmcode,
							GrdCode: FormState.values.grdcode,
							ShdCode: ShdCode != '' || ShdCode != null || typeof ShdCode != 'undefined' ? ShdCode : FormState.values.shdcode,
							ttype: ['8', '3', '30', '2', '34', '83', '42', '994', '992'],
							type: '',
							isall: IsAll,
							txntype: txntype
						}
					}
				)
			).then(response => {

				if (response.data.response.isauth == '_AUTHFAILED') {
				} else {

					setItemList(response.data.response.data);

				}

			}).catch(error => { console.log('Merge Master Get Error: ', error) });
	};

	useEffect(

		() => {

			if (typeof cancelToken != typeof undefined) {

				cancelToken.cancel('Canceling the previous req');
			}

			cancelToken = axios.CancelToken.source();

			console.log("onlyForProdPackingMod ===>", onlyForProdPackingMod)
			if (IsDisabled == 0 && onlyForProdPackingMod == false) {


				fetchMerge('', '');
			}

		}, []
	);

	const deleteMultipleItemCache = cacheArray => {

		localStorage.removeItem(cacheArray);

		if (typeof cancelToken != typeof undefined) {

			cancelToken.cancel('Canceling the previous req');
		}

		cancelToken = axios.CancelToken.source();

		if (onlyForProdPackingMod == false) {

			fetchMerge('', '');
		}
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

					const NextIndex = form.elements[index + 1].IconButton || form.elements[index + 1].disabled
						? index + 2
						: index + 1;

					if (form.elements.length > NextIndex) {

						form.elements[NextIndex].focus();
					}
				}

				event.preventDefault();
			}

			if (event.target.name === 'mercode') {

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
						inwgrdcode: value.MerCode,
						inwgrdname: value.MerName,
						mercode: value.MerCode,
						mername: value.MerName
					}
				}));

			} else {

				setFormState(FormState => ({
					...FormState,
					values: {
						...FormState.values,
						mercode: value.MerCode,
						mername: value.MerName
					}
				}));
			}
		}
	};

	const handleFocus = event => event.target.select();

	const clearPartyData = () => {

		const deleteSeletedRowCarton = FormState.values.d5 && FormState.values.d5.filter(el => {

			return el.srno != d1srno;

		});

		setFormState(FormState => ({
			...FormState,
			values: {
				...FormState.values,
				mercode: '',
				mername: '',
				d5: deleteSeletedRowCarton
			}
		}));
	}

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
				autoComplete
				style={{ width: 100 }}
				PopperComponent={CustomCodePopper}
				getOptionSelected={(option, value) => option.MerCode === value.MerCode}
				getOptionLabel={option => option.MerCode}
				renderOption={option => (<React.Fragment> <span>{option.MerCode}</span> </React.Fragment>)}
				renderInput={

					params => (

						<div ref={params.InputProps.ref}>
							<input
								type="text"
								{...params.inputProps}
								className={classes.input}
								disabled={type == 'view' || IsDisabled == 1 || onlyForProdPackingMod == true ? true : false}
								autoComplete="off"
								style={{ width: '100%', float: 'left' }}
								name={'mercode'}
								onFocus={handleFocus}
								onKeyDown={e => { handleOrderEnter(e) }}
							/>
						</div>
					)
				}
				value={{
					MerCode: `${FormState.values.mercode || ''}`
				}}
			/>
			{
				txntype == 'production_packing_automation' ?
					(
						<>
							<IconButton
								onKeyDown={handleOrderEnter}
								style={{ padding: '0px', float: 'left' }}
								//disabled={type == 'view' || IsHelpDisabled == 1 ? true : false}
								onClick={e => { handleHelpOpen('mercode') }}>
								<HelpIcon style={{ padding: '0', fontSize: '1.2rem', color: 'darkblue' }} />
							</IconButton>
						</>
					)
					:
					(
						<>
							<IconButton
								onKeyDown={handleOrderEnter}
								style={{ padding: '0px', float: 'left' }}
								disabled={type == 'view' || IsHelpDisabled == 1 ? true : false}
								onClick={e => { handleHelpOpen('mercode') }}>
								<HelpIcon style={{ padding: '0', fontSize: '1.2rem', color: type == 'view' || IsHelpDisabled == 1 ? 'darkgrey' : 'darkblue' }} />
							</IconButton>
						</>
					)
			}
			{/* <IconButton
				onKeyDown={handleOrderEnter}
				style={{ padding: '0px', float: 'left' }}
				disabled={type == 'view' || IsHelpDisabled == 1 ? true : false}
				onClick={e => { handleHelpOpen('mercode') }}>
				<HelpIcon style={{ padding: '0', fontSize: '1.2rem', color: type == 'view' || IsHelpDisabled == 1 ? 'darkgrey' : 'darkblue' }} />
			</IconButton> */}
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
				getOptionSelected={(option, value) => option.MerName === value.MerName}
				getOptionLabel={option => option.MerName}
				renderOption={option => (<React.Fragment> <span>{option.MerName}</span> </React.Fragment>)}
				renderInput={

					params => (

						<div ref={params.InputProps.ref}>
							<input
								type="text"
								{...params.inputProps}
								className={classes.input}
								autoComplete="off"
								disabled={type == 'view' || IsDisabled == 1 || onlyForProdPackingMod == true ? true : false}
								style={sm ? { width: '70%', float: 'left' } : { width: '60%', float: 'left' }}
								name={'mername'}
								onKeyDown={handleOrderEnter}
								onFocus={handleFocus}
							/>
						</div>
					)
				}
				value={{ MerName: `${FormState.values.mername || ''}` }}
			/>
			{
				txntype == 'production_planning' ?
					(
						<IconButton
							tooltip="clear party data"
							disabled={type == 'view' ? true : false}
							onKeyDown={handleOrderEnter}
							color="primary"
							size={'small'}
							onClick={clearPartyData}
							className={classes.iconButton}
							style={{ padding: '0px 10px', color: '#546e7a' }}
							aria-label="search">
							<DeleteForeverRoundedIcon style={{ padding: '0', fontSize: '1.1rem' }} onKeyDown={handleOrderEnter} />
						</IconButton>
					)
					:
					null
			}
			<IconButton onKeyDown={handleOrderEnter} tabIndex={-1} style={{ padding: '0px', float: 'right' }} disabled={type == 'view' ? true : false} onClick={() => deleteMultipleItemCache(['stateItem'])}>
				<CachedIcon style={{ padding: '0', fontSize: '1.2rem' }} />
			</IconButton>

			{
				MergeHelp &&
				(
					<MergeSelect
						MergeOpen={MergeHelp}
						handleHelpClose={handleHelpClose}
						FormState={FormState}
						setFormState={setFormState}
						txntype={txntype}
						PrpCode={PrpCode}
						YearNo={YearNo}
						StrCode={getItemStrCode != '' ? getItemStrCode : StrCode}
						// ShdCode={ShdCode}
						IsAll={IsAll}
						d1srno={d1srno}
						planninguid={planninguid}
						planningvouno={planningvouno}
						setD2DetailData={setD2DetailData}
						getD2DetailData={getD2DetailData}
						onlyForProdPackingMod={onlyForProdPackingMod}
						ItmCode={ItmCode || FormState.values.itmcode}
						GrdCode={GrdCode || FormState.values.grdcode}
						ShdCode={ShdCode || FormState.values.shdcode}
					// itemstrcode={getItemStrCode}
					/>
				)
			}
		</>
	);
}
