import React, { useEffect, useState } from 'react';
import { makeStyles } from '@material-ui/styles';
import { IconButton, useMediaQuery, Popper } from '@material-ui/core';
import theme from 'theme';
import { GetApiLink, getRequestConfig, sumProperty } from 'utils/comman';
import axios from 'axios';
import { Autocomplete, createFilterOptions } from '@material-ui/lab';
import HelpIcon from '@material-ui/icons/Help';
import { ProductionPackingHelpSelect } from './Components';

const useStyles = makeStyles(theme => ({
	option: {
		'&[data-focus="true"]': { backgroundColor: '#92c6ef', color: 'black' },
		'&[aria-selected="true"]': { backgroundColor: '#2196f3', color: 'white' }
	},
	input: { height: 25 }, label: { fontSize: 12, fontWeight: 'bold' }
}));

const CustomPopper = function (props) {

	const classes = useStyles();

	return (
		<Popper {...props} style={{ marginTop: 25, width: '270px', border: '1px solid black', borderRadius: 5 }} />
	);
};

export default function ProductionPackingHelpData(props) {

	const {
		setFormState, FormState, type, newPagePrpTypes, newPageStrDesc, txntype, PrpCode, YearNo, StrCode, IsDisable = 0, UId, setTotalChees,
		setTotalPendingChees, isHelpDisabled = 0, isRefreshData = 0, isFilterDisabled = 0,
		getOnlyForProdPackingMod,
		setOnlyForProdPackingMod = () => { },
		FormPackingState,
		setFormPackingState
	} = props;

	const classes = useStyles();
	const sm = useMediaQuery(theme.breakpoints.down('sm'));
	const md = useMediaQuery(theme.breakpoints.down('md'));
	const [PackingList, setPackingList] = useState([]);
	const [PackingD1List, setPackingD1List] = useState([]);
	const [PackingD2List, setPackingD2List] = useState([]);
	const OPTIONS_LIMIT = 20;
	const defaultFilterOptions = createFilterOptions();
	let cancelToken;
	const [ProdHelp, setProdHelpOpen] = useState(false);

	const filterOptions = (options, state) => {

		return defaultFilterOptions(options, state).slice(0, OPTIONS_LIMIT);
	};
	const handleHelpOpen = () => setProdHelpOpen(true);
	const handleHelpClose = () => setProdHelpOpen(false);

	const fetchDoffData = async () => {

		await axios
			.get(
				`${GetApiLink()}/api/prodpackinghelp`, getRequestConfig(
					{
						params: {
							prpcode: PrpCode,
							yearno: YearNo,
							strcode: StrCode,
							txntype: txntype,
							uid: UId
						}
					}

				), { cancelToken: cancelToken.token }

			).then(response => {

				if (response.data.success == true) {

					setPackingList(response.data.data.prodpackingmain);
					setPackingD1List(response.data.data.prodpackingd1);
					setPackingD2List(response.data.data.prodpackingd2);
				}

			}).catch(error => { console.log('Production Help Get Error: ', error) });
	};

	useEffect(

		() => {

			if (typeof cancelToken != typeof undefined) {

				cancelToken.cancel('Canceling the previous req');
			}

			cancelToken = axios.CancelToken.source();

			if (isRefreshData == 1) {

				setPackingList([]);
				setPackingD1List([]);
				setPackingD2List([]);
				fetchDoffData();

			} else {

				fetchDoffData();
			}

		}, []
	);

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

			if (event.target.name === 'planningvouno') {

				if (typeof cancelToken != typeof undefined) {

					cancelToken.cancel('Canceling the previous req');

				}

				cancelToken = axios.CancelToken.source();
			}
		}
	}

	const loadItemData = (event, value) => {

		if (value !== '' && value !== null && typeof value !== 'undefined') {

			setFormState(FormState => ({
				...FormState,
				values: {
					...FormState.values,
					prcuid: value.productionuid,
					prcdate: value.productionvoudate,
					planuid: value.planninguid,
					productionvouno: value.productionvouno,
					productionuid: value.productionuid,
					productionvoudate: value.productionvoudate,
					prcsrno: 0,
					maccode: value.maccode,
					macname: value.macname,
					itmcode: value.itmcode,
					itmname: value.itmname,
					denier: value.denier,
					mercode: value.mercode == null ? '' : value.mercode,
					mername: value.mername == null ? '' : value.mername,
					grdcode: value.grdcode == null ? '' : value.grdcode,
					shdcode: value.shdcode,
					shdname: value.shdname,
					parcode: value.parcode == null ? '' : value.parcode,
					parname: value.parname == null ? '' : value.parname,
					cheeswt: parseFloat(value.cheeswt),
					totchees: txntype == 'production_packing' ? parseFloat(value.cheeswt) : '0.00',
					totpending: '0.00'
				}
			}));

		}
	};

	const handleFocus = event => event.target.select();

	return (
		<>
			<Autocomplete
				id="combo-box-demo-item-name"
				filterOptions={filterOptions}
				options={PackingList}
				classes={{ option: classes.option }}
				onKeyDown={handleOrderEnter}
				onChange={(event, value) => { loadItemData(event, value) }}
				autoHighlight
				fullWidth={false}
				PopperComponent={CustomPopper}
				getOptionSelected={(option, value) => option.productionvouno === value.productionvouno}
				getOptionLabel={option => option.productionvouno}
				renderOption={option => (<React.Fragment> <span>{option.productionvouno}</span> </React.Fragment>)}
				renderInput={params => (
					<div ref={params.InputProps.ref}>
						<input
							type="text"
							{...params.inputProps}
							className={classes.input}
							autoComplete="off"
							disabled
							style={sm ? { width: '85%', float: 'left' } : { width: '86%', float: 'left' }}
							name={'productionvouno'}
							onKeyDown={handleOrderEnter}
							onFocus={handleFocus}
						/>
					</div>
				)}
				value={{ productionvouno: `${FormState.values.productionvouno || ''}` }}
			/>
			<IconButton
				onKeyDown={handleOrderEnter}
				style={{ padding: '0px', float: 'left' }}
				disabled={type == 'view' || IsDisable == 1 || isHelpDisabled == 1 ? true : false}
				onClick={e => { handleHelpOpen() }}>
				<HelpIcon style={{ padding: '0', fontSize: '1.2rem', color: type == 'view' || IsDisable == 1 || isHelpDisabled == 1 ? 'darkgrey' : 'darkblue' }} />
			</IconButton>

			{
				ProdHelp &&
				(
					<ProductionPackingHelpSelect
						ProdRecipeOpen={ProdHelp}
						handleHelpClose={handleHelpClose}
						FormState={FormState}
						setFormState={setFormState}
						txntype={txntype}
						PrpCode={PrpCode}
						YearNo={YearNo}
						StrCode={StrCode}
						UId={UId}
						setTotalChees={setTotalChees}
						setTotalPendingChees={setTotalPendingChees}
						isRefreshData={isRefreshData}
						isFilterDisabled={isFilterDisabled}
						setOnlyForProdPackingMod={setOnlyForProdPackingMod}
						FormPackingState={FormPackingState}
						setFormPackingState={setFormPackingState}
					/>
				)
			}
		</>
	);
}
