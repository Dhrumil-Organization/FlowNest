// ============================================================
// PRINT / PDF BUTTON PATCHES
// ============================================================
// Add a "Print / Share PDF" button on:
//   1) CostSheetScreen (so costing person can print/share)
//   2) AuthReviewScreen (so authorizer can review PDF too)
// ============================================================

// ──────────────────────────────────────────────────────────
// 1) Add import (top of both files):
// ──────────────────────────────────────────────────────────
import {Linking, Share, Alert as RNAlert} from 'react-native';

// ──────────────────────────────────────────────────────────
// 2) Add this handler inside the component (both files):
// ──────────────────────────────────────────────────────────
const [generatingPdf, setGeneratingPdf] = useState(false);

const handlePrintPdf = async () => {
  setGeneratingPdf(true);
  try {
    const result = await costSheetApi.generatePdf(inquiryId, designId);

    // Construct full URL (the backend returns a relative URL like /storage/...)
    const base = 'https://your-domain.com'; // Replace with your actual API base
    const fullUrl = result.pdf_url.startsWith('http')
      ? result.pdf_url
      : base + result.pdf_url;

    Alert.alert(
      'PDF Generated',
      'Your cost sheet PDF is ready',
      [
        {
          text: 'Open',
          onPress: () => Linking.openURL(fullUrl),
        },
        {
          text: 'Share',
          onPress: () =>
            Share.share({
              message: `Cost Sheet for inquiry: ${fullUrl}`,
              url: fullUrl,
            }),
        },
        {text: 'Cancel', style: 'cancel'},
      ],
    );
  } catch (e: any) {
    Alert.alert('Error', e?.response?.data?.message || 'Failed to generate PDF');
  } finally {
    setGeneratingPdf(false);
  }
};

// ──────────────────────────────────────────────────────────
// 3) Add Print button in CostSheetScreen:
//    Place it in the action buttons row (only show if not draft):
// ──────────────────────────────────────────────────────────

// REPLACE the existing action buttons block at the bottom with this:
{!readonly ? (
  <View style={{flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md}}>
    <Button
      title="Save Draft"
      variant="secondary"
      onPress={saveDraft}
      loading={saving}
      style={{flex: 1}}
    />
    <Button
      title="Submit for Auth"
      onPress={submitForAuth}
      loading={submitting}
      style={{flex: 2}}
    />
  </View>
) : null}

{/* NEW: Print button - show whenever sheet has been saved */}
{sheet.id ? (
  <Button
    title={generatingPdf ? "Generating PDF..." : "🖨 Print / Share PDF"}
    variant="secondary"
    onPress={handlePrintPdf}
    loading={generatingPdf}
    style={{marginTop: spacing.sm}}
  />
) : null}

// ──────────────────────────────────────────────────────────
// 4) Add Print button in AuthReviewScreen:
//    Add ABOVE the Approve/Reject buttons:
// ──────────────────────────────────────────────────────────
{sheet ? (
  <Button
    title={generatingPdf ? "Generating..." : "🖨 View as PDF"}
    variant="secondary"
    onPress={handlePrintPdf}
    loading={generatingPdf}
    style={{marginTop: spacing.md}}
  />
) : null}
